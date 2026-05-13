'use strict';

const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const BASE_URL = 'https://dna-calculator-production.up.railway.app';

const HEADERS = [
  'ID', 'Дата', 'Имя', 'Telegram', 'Дубль', 'Ниша',
  'Выручка', 'Мастеров', 'Мест', 'База', 'Активных', '% АКБ',
  'Потенциал/мес', 'Потенциал/год', 'Топ-боль',
  'База/АКБ', 'Недозагрузка', 'Нет финучёта', 'Нет допродаж',
  'Результат'
];

const RESULT_COL = 19; // 0-based index of 'Результат'

const SEG_COLS = [
  { index: 15, label: '👥 База/АКБ',     bg: { red: 0.996, green: 0.949, blue: 0.800 }, fg: { red: 0.573, green: 0.251, blue: 0.055 } },
  { index: 16, label: '📅 Недозагрузка', bg: { red: 0.859, green: 0.929, blue: 0.996 }, fg: { red: 0.118, green: 0.251, blue: 0.686 } },
  { index: 17, label: '💰 Нет финучёта', bg: { red: 0.996, green: 0.886, blue: 0.886 }, fg: { red: 0.600, green: 0.106, blue: 0.106 } },
  { index: 18, label: '💬 Нет допродаж', bg: { red: 0.949, green: 0.906, blue: 1.000 }, fg: { red: 0.420, green: 0.129, blue: 0.627 } },
];

const DUP_COL = { index: 4, bg: { red: 1.0, green: 0.949, blue: 0.4 }, fg: { red: 0.4, green: 0.2, blue: 0.0 } };

const COL_WIDTHS = [
  40, 130, 130, 160, 60, 130,
  90, 80, 60, 80, 80, 60,
  115, 115, 200,
  110, 110, 110, 110,
  110
];

const NICHE_LABELS = {
  nails: 'Ногти/ресницы', hair: 'Парикмахерская', massage: 'Массаж',
  laser: 'Лазерная', cosmo: 'Косметология', sugar: 'Шугаринг', complex: 'Комплексный'
};

function getAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey      = process.env.GOOGLE_PRIVATE_KEY || '';
  const privateKey  = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
  console.log('[Sheets] auth check — email:', !!clientEmail, 'keyLen:', privateKey.length, 'sheetId:', !!SHEET_ID);
  if (!clientEmail || privateKey.length < 100 || !SHEET_ID) return null;
  return new google.auth.JWT({
    email: clientEmail, key: privateKey,
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
  return [
    parseFloat(lead.active_rate_pct) < 20                                                          ? '👥 База/АКБ'     : '',
    ['lt50','5065'].includes(answers.q_load) || (lead.seats||0) > (lead.masters||0)               ? '📅 Недозагрузка' : '',
    ['no','rough'].includes(answers.q_finance)                                                     ? '💰 Нет финучёта' : '',
    ['never','sometimes'].includes(answers.q_upsell)                                               ? '💬 Нет допродаж' : '',
  ];
}

function leadToRow(lead, dupTgs = new Set()) {
  const topPains = JSON.parse(lead.top_pains || '[]');
  const topPain  = topPains[0] ? `${topPains[0].label}: +${topPains[0].amount} ₽` : '';
  const tg       = normalizeTg(lead.telegram);
  return [
    lead.id,
    new Date(lead.created_at).toLocaleString('ru-RU'),
    lead.name || '',
    tg,
    dupTgs.has(tg) ? 'Дубль' : '',
    NICHE_LABELS[lead.niche] || lead.niche || '',
    lead.revenue         || 0,
    lead.masters         || 0,
    lead.seats           || 0,
    lead.base_size       || 0,
    lead.active_clients  || 0,
    lead.active_rate_pct || 0,
    lead.potential_monthly || 0,
    lead.potential_annual  || 0,
    topPain,
    ...getSegmentValues(lead),
    '' // Результат — заполняется отдельно через setHyperlinks
  ];
}

// Вставляет гиперссылки в колонку "Результат" через API (без формул)
async function setHyperlinks(sheets, tabId, leads) {
  const linkColor = { red: 0.118, green: 0.251, blue: 0.686 };
  const requests  = leads.map((lead, i) => ({
    updateCells: {
      rows: [{
        values: [{
          userEnteredValue: { stringValue: 'Открыть' },
          userEnteredFormat: {
            textFormat: { link: { uri: `${BASE_URL}/admin/print/${lead.id}` }, foregroundColor: linkColor, underline: true }
          }
        }]
      }],
      fields: 'userEnteredValue,userEnteredFormat.textFormat',
      start: { sheetId: tabId, rowIndex: i + 1, columnIndex: RESULT_COL }
    }
  }));

  // Шлём пачками по 500 чтобы не превысить лимит запроса
  for (let i = 0; i < requests.length; i += 500) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: requests.slice(i, i + 500) }
    });
  }
}

async function applyFormatting(sheets, tabId, dataRows) {
  const purple      = { red: 0.298, green: 0.114, blue: 0.584 };
  const lightPurple = { red: 0.973, green: 0.961, blue: 1.000 };
  const white       = { red: 1,     green: 1,     blue: 1     };
  const endRow      = Math.max(dataRows + 2, 500);

  const requests = [
    { updateSheetProperties: { properties: { sheetId: tabId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
    {
      repeatCell: {
        range: { sheetId: tabId, startRowIndex: 0, endRowIndex: 1 },
        cell: { userEnteredFormat: { backgroundColor: purple, textFormat: { bold: true, fontSize: 10, foregroundColor: white }, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', wrapStrategy: 'CLIP' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
      }
    },
    {
      repeatCell: {
        range: { sheetId: tabId, startRowIndex: 1, endRowIndex: endRow },
        cell: { userEnteredFormat: { verticalAlignment: 'MIDDLE', wrapStrategy: 'CLIP' } },
        fields: 'userEnteredFormat(verticalAlignment,wrapStrategy)'
      }
    },
    { addBanding: { bandedRange: { range: { sheetId: tabId, startRowIndex: 1, endRowIndex: 10000 }, rowProperties: { firstBandColor: white, secondBandColor: lightPurple } } } },
    ...COL_WIDTHS.map((px, i) => ({
      updateDimensionProperties: {
        range: { sheetId: tabId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: px }, fields: 'pixelSize'
      }
    })),
    ...SEG_COLS.flatMap(seg => [
      { setDataValidation: { range: { sheetId: tabId, startRowIndex: 1, endRowIndex: 10000, startColumnIndex: seg.index, endColumnIndex: seg.index + 1 }, rule: { condition: { type: 'ONE_OF_LIST', values: [{ userEnteredValue: seg.label }] }, showCustomUi: true, strict: false } } },
      { repeatCell: { range: { sheetId: tabId, startRowIndex: 1, endRowIndex: endRow, startColumnIndex: seg.index, endColumnIndex: seg.index + 1 }, cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } }, fields: 'userEnteredFormat.horizontalAlignment' } }
    ]),
    ...SEG_COLS.map(seg => ({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: tabId, startRowIndex: 1, endRowIndex: 10000, startColumnIndex: seg.index, endColumnIndex: seg.index + 1 }],
          booleanRule: { condition: { type: 'NOT_BLANK' }, format: { backgroundColor: seg.bg, textFormat: { foregroundColor: seg.fg, bold: true } } }
        },
        index: 0
      }
    })),
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: tabId, startRowIndex: 1, endRowIndex: 10000, startColumnIndex: DUP_COL.index, endColumnIndex: DUP_COL.index + 1 }],
          booleanRule: { condition: { type: 'NOT_BLANK' }, format: { backgroundColor: DUP_COL.bg, textFormat: { foregroundColor: DUP_COL.fg, bold: true } } }
        },
        index: 0
      }
    },
    { repeatCell: { range: { sheetId: tabId, startRowIndex: 1, endRowIndex: endRow, startColumnIndex: DUP_COL.index, endColumnIndex: DUP_COL.index + 1 }, cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } }, fields: 'userEnteredFormat.horizontalAlignment' } },
    { repeatCell: { range: { sheetId: tabId, startRowIndex: 1, endRowIndex: endRow, startColumnIndex: RESULT_COL, endColumnIndex: RESULT_COL + 1 }, cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } }, fields: 'userEnteredFormat.horizontalAlignment' } }
  ];

  await sheets.spreadsheets.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { requests } });
}

async function syncAllLeads(leads) {
  const auth = getAuth();
  if (!auth) return { ok: false, error: 'env not configured' };
  await auth.authorize();
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: 'A:Z' });

  const tgCounts = {};
  leads.forEach(l => { const n = normalizeTg(l.telegram); if (n) tgCounts[n] = (tgCounts[n] || 0) + 1; });
  const dupTgs = new Set(Object.keys(tgCounts).filter(k => tgCounts[k] > 1));

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID, range: 'A1',
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS, ...leads.map(l => leadToRow(l, dupTgs))] }
  });

  const spreadsheet  = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const tabId        = spreadsheet.data.sheets[0].properties.sheetId;
  const bandings     = spreadsheet.data.sheets[0].bandedRanges    || [];
  const condFormats  = spreadsheet.data.sheets[0].conditionalFormats || [];
  const cleanReqs    = [
    ...bandings.map(b => ({ deleteBanding: { bandedRangeId: b.bandedRangeId } })),
    ...condFormats.map(() => ({ deleteConditionalFormatRule: { sheetId: tabId, index: 0 } }))
  ];
  if (cleanReqs.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { requests: cleanReqs } });
  }

  await applyFormatting(sheets, tabId, leads.length);
  await setHyperlinks(sheets, tabId, leads);

  return { ok: true, count: leads.length };
}

async function appendLead(lead) {
  try {
    const auth = getAuth();
    if (!auth) return;
    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    const check = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'A1:A1' });
    if (!check.data.values || check.data.values[0]?.[0] !== 'ID') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID, range: 'A1',
        valueInputOption: 'RAW', requestBody: { values: [HEADERS] }
      });
    }

    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID, range: 'A1',
      valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [leadToRow(lead)] }
    });

    // Определяем строку и ставим гиперссылку
    const updatedRange = appendRes.data.updates?.updatedRange || '';
    const match = updatedRange.match(/!A(\d+):/);
    if (match) {
      const rowIndex = parseInt(match[1]) - 1; // 0-based
      const sp = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
      const tabId = sp.data.sheets[0].properties.sheetId;
      const linkColor = { red: 0.118, green: 0.251, blue: 0.686 };
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{
            updateCells: {
              rows: [{ values: [{ userEnteredValue: { stringValue: 'Открыть' }, userEnteredFormat: { textFormat: { link: { uri: `${BASE_URL}/admin/print/${lead.id}` }, foregroundColor: linkColor, underline: true } } }] }],
              fields: 'userEnteredValue,userEnteredFormat.textFormat',
              start: { sheetId: tabId, rowIndex, columnIndex: RESULT_COL }
            }
          }]
        }
      });
    }
  } catch (err) {
    console.error('[Sheets] appendLead error:', err.message);
  }
}

module.exports = { appendLead, syncAllLeads };
