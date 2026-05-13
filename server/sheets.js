'use strict';

const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const HEADERS  = [
  'ID', 'Дата', 'Источник', 'Имя', 'Telegram', 'Ниша', 'Город',
  'Выручка', 'Мастеров', 'Мест', 'База', 'Активных', '% АКБ',
  'Потенциал/мес', 'Потенциал/год', 'Топ-боль',
  'База/АКБ', 'Недозагрузка', 'Нет финучёта', 'Нет допродаж',
  'Менеджер', 'Статус'
];

// Segment column indices (0-based)
const SEG_COLS = [
  { index: 16, label: '👥 База/АКБ',     bg: { red: 0.996, green: 0.949, blue: 0.800 }, fg: { red: 0.573, green: 0.251, blue: 0.055 } },
  { index: 17, label: '📅 Недозагрузка', bg: { red: 0.859, green: 0.929, blue: 0.996 }, fg: { red: 0.118, green: 0.251, blue: 0.686 } },
  { index: 18, label: '💰 Нет финучёта', bg: { red: 0.996, green: 0.886, blue: 0.886 }, fg: { red: 0.600, green: 0.106, blue: 0.106 } },
  { index: 19, label: '💬 Нет допродаж', bg: { red: 0.949, green: 0.906, blue: 1.000 }, fg: { red: 0.420, green: 0.129, blue: 0.627 } },
];

const COL_WIDTHS = [
  40, 130, 70, 130, 160, 130, 90,   // ID Дата Источник Имя TG Ниша Город
  90, 80, 60, 80, 80, 60,            // Выручка Мастеров Мест База Активных %АКБ
  115, 115, 200,                     // Потенциал/мес Потенциал/год Топ-боль
  110, 110, 110, 110,                // 4 сегмента
  110, 120                           // Менеджер Статус
];

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

function getSegmentValues(lead) {
  const answers = JSON.parse(lead.answers || '{}');
  const aktRate  = parseFloat(lead.active_rate_pct);
  return [
    aktRate < 20                                                                                   ? '👥 База/АКБ'     : '',
    ['lt50','5065'].includes(answers.q_load) || (lead.seats||0) > (lead.masters||0)               ? '📅 Недозагрузка' : '',
    ['no','rough'].includes(answers.q_finance)                                                     ? '💰 Нет финучёта' : '',
    ['never','sometimes'].includes(answers.q_upsell)                                               ? '💬 Нет допродаж' : '',
  ];
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
    ...getSegmentValues(lead),
    lead.manager || '',
    STATUS_LABELS[lead.status] || lead.status || ''
  ];
}

async function applyFormatting(sheets, tabId, dataRows) {
  const purple      = { red: 0.298, green: 0.114, blue: 0.584 };
  const lightPurple = { red: 0.973, green: 0.961, blue: 1.000 };
  const white       = { red: 1,     green: 1,     blue: 1     };
  const endRow      = Math.max(dataRows + 2, 500);

  const requests = [
    // Freeze header
    {
      updateSheetProperties: {
        properties: { sheetId: tabId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount'
      }
    },
    // Header formatting
    {
      repeatCell: {
        range: { sheetId: tabId, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: purple,
            textFormat: { bold: true, fontSize: 10, foregroundColor: white },
            horizontalAlignment: 'CENTER',
            verticalAlignment:   'MIDDLE',
            wrapStrategy: 'CLIP'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
      }
    },
    // Data rows base style
    {
      repeatCell: {
        range: { sheetId: tabId, startRowIndex: 1, endRowIndex: endRow },
        cell: {
          userEnteredFormat: { verticalAlignment: 'MIDDLE', wrapStrategy: 'CLIP' }
        },
        fields: 'userEnteredFormat(verticalAlignment,wrapStrategy)'
      }
    },
    // Alternating row banding
    {
      addBanding: {
        bandedRange: {
          range: { sheetId: tabId, startRowIndex: 1, endRowIndex: 10000 },
          rowProperties: { firstBandColor: white, secondBandColor: lightPurple }
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
    })),
    // Data validation (dropdown) + center align for each segment column
    ...SEG_COLS.flatMap(seg => [
      {
        setDataValidation: {
          range: { sheetId: tabId, startRowIndex: 1, endRowIndex: 10000, startColumnIndex: seg.index, endColumnIndex: seg.index + 1 },
          rule: {
            condition: { type: 'ONE_OF_LIST', values: [{ userEnteredValue: seg.label }] },
            showCustomUi: true,
            strict: false
          }
        }
      },
      {
        repeatCell: {
          range: { sheetId: tabId, startRowIndex: 1, endRowIndex: endRow, startColumnIndex: seg.index, endColumnIndex: seg.index + 1 },
          cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
          fields: 'userEnteredFormat.horizontalAlignment'
        }
      }
    ]),
    // Conditional formatting: color filled segment cells
    ...SEG_COLS.map(seg => ({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: tabId, startRowIndex: 1, endRowIndex: 10000, startColumnIndex: seg.index, endColumnIndex: seg.index + 1 }],
          booleanRule: {
            condition: { type: 'NOT_BLANK' },
            format: {
              backgroundColor: seg.bg,
              textFormat: { foregroundColor: seg.fg, bold: true }
            }
          }
        },
        index: 0
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

  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: 'A:Z' });

  const values = [HEADERS, ...leads.map(leadToRow)];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'A1',
    valueInputOption: 'RAW',
    requestBody: { values }
  });

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const tabId       = spreadsheet.data.sheets[0].properties.sheetId;

  // Remove existing bandings and conditional format rules
  const sheet          = spreadsheet.data.sheets[0];
  const bandings       = sheet.bandedRanges || [];
  const condFormats    = sheet.conditionalFormats || [];
  const cleanRequests  = [
    ...bandings.map(b => ({ deleteBanding: { bandedRangeId: b.bandedRangeId } })),
    ...condFormats.map((_, i) => ({ deleteConditionalFormatRule: { sheetId: tabId, index: 0 } }))
  ];
  if (cleanRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: cleanRequests }
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
