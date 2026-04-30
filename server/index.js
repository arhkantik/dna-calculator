'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors    = require('cors');

const { calculate }        = require('./calculate');
const { generateMessage }  = require('./claude');
const { saveDiagnostic, getHistory, getDiagnosticById } = require('./db');

const app  = express();
const PROD = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

// POST /api/diagnose
app.post('/api/diagnose', async (req, res) => {
  try {
    const input = req.body;
    input.revenue       = Number(input.revenue);
    input.masters       = Number(input.masters);
    input.seats         = Number(input.seats);
    input.baseSize      = Number(input.baseSize);
    input.activeClients = Number(input.activeClients);

    const calc = calculate(input);

    let generatedMessage = '';
    try {
      generatedMessage = await generateMessage({ ...input, ...calc });
    } catch (err) {
      console.error('Claude API error:', err.message);
      generatedMessage = `[Ошибка генерации сообщения: ${err.message}]`;
    }

    const id = saveDiagnostic({
      leadName:        input.leadName,
      segment:         input.segment,
      niche:           input.niche,
      city:            input.city,
      revenue:         input.revenue,
      masters:         input.masters,
      seats:           input.seats,
      baseSize:        input.baseSize,
      activeClients:   input.activeClients,
      answers:         input.answers,
      totalMonthly:    calc.totalMonthly,
      totalAnnual:     calc.totalAnnual,
      generatedMessage
    });

    res.json({ id, ...calc, generatedMessage, formData: input });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history
app.get('/api/history', (_req, res) => {
  try {
    res.json(getHistory());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/diagnostic/:id
app.get('/api/diagnostic/:id', (req, res) => {
  try {
    const row = getDiagnosticById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Не найдено' });

    const answers = JSON.parse(row.answers);
    const input   = {
      revenue:       row.revenue,
      masters:       row.masters,
      seats:         row.seats,
      baseSize:      row.base_size,
      activeClients: row.active_clients,
      niche:         row.niche,
      city:          row.city,
      segment:       row.segment,
      leadName:      row.lead_name,
      answers
    };
    const calc = calculate(input);

    res.json({
      id:               row.id,
      createdAt:        row.created_at,
      leadName:         row.lead_name,
      generatedMessage: row.generated_message,
      formData:         input,
      ...calc
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// В продакшне — отдаём собранный React
if (PROD) {
  const dist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 DNA Calculator → http://localhost:${PORT} [${PROD ? 'production' : 'development'}]\n`);
});
