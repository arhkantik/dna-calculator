'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors    = require('cors');

const { calculate }       = require('./calculate');
const { saveDiagnostic, getHistory, getDiagnosticById } = require('./db');
const { saveLead, getLeads, updateLeadStatus }          = require('./leads-db');

const app  = express();
const PROD = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

// ─── Existing internal endpoints ────────────────────────────────────────────

// POST /api/diagnose — calculate only, no Claude
app.post('/api/diagnose', async (req, res) => {
  try {
    const input = req.body;
    input.revenue       = Number(input.revenue);
    input.masters       = Number(input.masters);
    input.seats         = Number(input.seats);
    input.baseSize      = Number(input.baseSize);
    input.activeClients = Number(input.activeClients);

    const calc = calculate(input);

    saveDiagnostic({
      leadName:      input.leadName,
      segment:       input.segment,
      niche:         input.niche,
      city:          input.city,
      revenue:       input.revenue,
      masters:       input.masters,
      seats:         input.seats,
      baseSize:      input.baseSize,
      activeClients: input.activeClients,
      answers:       input.answers,
      totalMonthly:  calc.totalMonthly,
      totalAnnual:   calc.totalAnnual,
      generatedMessage: ''
    });

    res.json({ ...calc, formData: input });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history
app.get('/api/history', (_req, res) => {
  try { res.json(getHistory()); }
  catch (err) { res.status(500).json({ error: err.message }); }
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

    res.json({ id: row.id, createdAt: row.created_at, leadName: row.lead_name, formData: input, ...calc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Public leads ────────────────────────────────────────────────────────────

// POST /api/leads — save lead when they click CTA
app.post('/api/leads', (req, res) => {
  try {
    const d = req.body;
    const id = saveLead({
      name:             d.name,
      telegram:         d.telegram,
      niche:            d.niche,
      city:             d.city,
      revenue:          Number(d.revenue),
      masters:          Number(d.masters),
      seats:            Number(d.seats),
      baseSize:         Number(d.baseSize),
      activeClients:    Number(d.activeClients),
      activeRatePct:    Number(d.activeRatePct),
      answers:          d.answers || {},
      potentialMonthly: Number(d.potentialMonthly),
      potentialAnnual:  Number(d.potentialAnnual),
      topPains:         d.topPains || [],
      modulesTriggered: d.modulesTriggered || []
    });
    res.json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin ───────────────────────────────────────────────────────────────────

// GET /api/admin/leads
app.get('/api/admin/leads', (_req, res) => {
  try { res.json(getLeads()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/leads/:id/status
app.patch('/api/admin/leads/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['new', 'contacted', 'scheduled', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Неверный статус' });
    updateLeadStatus(req.params.id, status);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Static ──────────────────────────────────────────────────────────────────

if (PROD) {
  const dist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 DNA Calculator → http://localhost:${PORT} [${PROD ? 'production' : 'development'}]\n`);
});
