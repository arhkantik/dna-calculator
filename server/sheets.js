'use strict';

const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const HEADERS  = [
  'ID', 'Дата', 'Источник', 'Имя', 'Telegram', 'Ниша', 'Город',
  'Выручка', 'Мастеров', 'Мест', 'База', 'Активных', '% АКБ',
  'Потенциал/мес', 'Потенциал/год', 'Топ-боль', 'Статус'
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
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

async function ensureHeaders(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'A1:Q1'
  });
  const existing = res.data.values?.[0];
  if (!existing || existing.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'A1',
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] }
    });
  }
}

async function appendLead(lead) {
  try {
    const auth = getAuth();
    if (!auth) return; // env vars не настроены — пропускаем

    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    await ensureHeaders(sheets);

    const topPains = JSON.parse(lead.top_pains || '[]');
    const topPain  = topPains[0] ? `${topPains[0].label}: +${topPains[0].amount} ₽` : '';

    const row = [
      lead.id,
      new Date(lead.created_at).toLocaleString('ru-RU'),
      lead.source === 'manager' ? 'Созвон' : 'Лид',
      lead.name || '',
      lead.telegram || '',
      NICHE_LABELS[lead.niche] || lead.niche || '',
      lead.city === 'moscow' ? 'Москва/СПб' : 'Регион',
      lead.revenue || 0,
      lead.masters || 0,
      lead.seats || 0,
      lead.base_size || 0,
      lead.active_clients || 0,
      lead.active_rate_pct || 0,
      lead.potential_monthly || 0,
      lead.potential_annual || 0,
      topPain,
      lead.status || 'new'
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'A1',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] }
    });
  } catch (err) {
    console.error('Google Sheets error:', err.message);
  }
}

module.exports = { appendLead };
