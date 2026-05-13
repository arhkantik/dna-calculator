'use strict';

const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const HEADERS  = [
  'ID', 'Дата', 'Источник', 'Имя', 'Telegram', 'Ниша', 'Город',
  'Выручка', 'Мастеров', 'Мест', 'База', 'Активных', '% АКБ',
  'Потенциал/мес', 'Потенциал/год', 'Топ-боль', 'Сегменты', 'Менеджер', 'Статус'
];

const COL_WIDTHS = [40, 130, 70, 130, 160, 130, 90, 90, 80, 60, 80, 80, 60, 110, 110, 220, 220, 110, 120];

const NICHE_LABELS = {
  nails: 'Ногти/ресницы', hair: 'Парикмахерская', massage: 'Массаж',
  laser: 'Лазерная', cosmo: 'Косметология', sugar: 'Шугаринг', complex: 'Комплексный'
};

const STATUS_LABELS = {
  new: 'Новый', contacted: 'Написали', scheduled: 'Разбор назначен', closed: 'Закрыт'
};

function getAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey      = process.env.GOOGLE_PRIVATE_KEY || '';
  const privateKey  = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

  console.log('[Sheets] auth check — email:', !!clientEmail, 'keyLen:', privateKey.length, 'sheetId:', !!SHEET_ID);

  if (!clientEmail || privateKey.length < 100 || !SHEET_ID) return null;

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

function normalizeTg(raw) {
  if (!raw) return '';
  const s = raw.trim();
  if (/^[\d\+\-\s()]{7,}$/.test(s)) return s;
  const handle = s.startsWith('@') ? s.slice(1) : s;
  return '@' + handle.toLowerCase();
}

function getSegmentsStr(lead) {
  const answers = JSON.parse(lead.answers || '{}');
  const segs = [];
  if (parseFloat(lead.active_rate_pct) < 20) segs.push('👥 База/АКБ');
  if (['lt50', '5065'].includes(answers.q_load) || (lead.seats || 0) > (lead.masters || 0)) segs.push('📅 Недозагрузка');
  if (['no', 'rough'].includes(answers.q_finance)) segs.push('💰 Нет финучёта');
  if (['never', 'sometimes'].includes(answers.q_upsell)) segs.push('💬 Нет допродаж');
  return segs.join('; ');
}

function leadToRow(lead) {
  const topPains = JSON.parse(lead.top_pains || '[]');
  const topPain  = topPains[0] ? `${topPains[0].label}: +${topPains[0].amount} ₽` : '';
  return [
    lead.id,
    new Date(lead.created_at).toLocaleString('ru-RU'),
    lead.source === 'manager' ? 'Созвон' : 'Лид',
    lead.name    || '',
    normalizeTg(lead.telegram),
    NICHE_LABELS[lead.niche] || lead.niche || '',
    lead.city === 'moscow' ? 'Москва/СПб' : 'Регион',
    lead.revenue        || 0,
    lead.masters        || 0,
    lead.seats          || 0,
    lead.base_size      || 0,
    lead.active_clients || 0,
    lead.active_rate_pct || 0,
    lead.potential_monthly || 0,
    lead.potential_annual  || 0,
    topPain,
    getSegmentsStr(lead),
    lead.manager || '',
    STATUS_LABELS[lead.status] || lead.status || ''
  ];
}

async function getTabId(sheets) {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  return res.data.sheets[0].properties.sheetId;
}

async function applyFormatting(sheets, tabId, dataRows) {
  const purple      = { red: 0.298, green: 0.114, blue: 0.584 }; // #4c1d95
  const lightPurple = { red: 0.973, green: 0.961, blue: 1.0   }; // #f8f5ff
  const white       = { red: 1,     green: 1,     blue: 1     };

  const requests = [
    // Freeze header row
    {
      updateSheetProperties: {
        properties: { sheetId: tabId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount'
      }
    },
    // Header: purple bg, white bold text, centered
    {
      repeatCell: {
        range: { sheetId: tabId, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: purple,
            textFormat: {
              bold: true,
              fontSize: 10,
              foregroundColor: white
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment:   'MIDDLE',
            wrapStrategy: 'CLIP'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
      }
    },
    // Data rows: alternating white / light purple, vertically centered
    {
      repeatCell: {
        range: { sheetId: tabId, startRowIndex: 1, endRowIndex: Math.max(dataRows + 2, 500) },
        cell: {
          userEnteredFormat: {
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'CLIP'
          }
        },
        fields: 'userEnteredFormat(verticalAlignment,wrapStrategy)'
      }
    },
    // Alternating row banding
    {
      addBanding: {
        bandedRange: {
          range: { sheetId: tabId, startRowIndex: 1, endRowIndex: 10000 },
          rowProperties: {
            firstBandColor:  white,
            secondBandColor: lightPurple
          }
        }
      }
    },
    // Column widths
    ...COL_WIDTHS.map((px, i) => ({
      updateDimensionProperties: {
        range: { sheetId: tabId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: px },
        fields: 'pixelSize'
      }
    }))
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests }
  });
}

async function syncAllLeads(leads) {
  const auth = getAuth();
  if (!auth) return { ok: false, error: 'env not configured' };
  await auth.authorize();
  const sheets = google.sheets({ version: 'v4', auth });

  // Clear existing data
  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: 'A:Z' });

  // Write headers + all rows
  const values = [HEADERS, ...leads.map(leadToRow)];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'A1',
    valueInputOption: 'RAW',
    requestBody: { values }
  });

  // Remove existing bandings to avoid conflicts
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const tabId       = spreadsheet.data.sheets[0].properties.sheetId;
  const bandings    = spreadsheet.data.sheets[0].bandedRanges || [];
  if (bandings.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: bandings.map(b => ({ deleteBanding: { bandedRangeId: b.bandedRangeId } }))
      }
    });
  }

  await applyFormatting(sheets, tabId, leads.length);
  return { ok: true, count: leads.length };
}

async function appendLead(lead) {
  try {
    const auth = getAuth();
    if (!auth) return;
    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    // Ensure header exists
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'A1:A1' });
    if (!res.data.values || res.data.values[0]?.[0] !== 'ID') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID, range: 'A1',
        valueInputOption: 'RAW', requestBody: { values: [HEADERS] }
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'A1',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [leadToRow(lead)] }
    });
  } catch (err) {
    console.error('[Sheets] appendLead error:', err.message);
  }
}

module.exports = { appendLead, syncAllLeads };
