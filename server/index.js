'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors    = require('cors');

const { calculate }       = require('./calculate');
const { saveDiagnostic, getHistory, getDiagnosticById } = require('./db');
const { saveLead, getLeads, getLeadById, updateLeadStatus, markLeadClickedTg, updateLeadManager, archiveLead, unarchiveLead } = require('./leads-db');
const { appendLead, syncAllLeads } = require('./sheets');

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

    saveDiagnostic({
      leadName: input.leadName, segment: input.segment,
      niche: input.niche, city: input.city,
      revenue: input.revenue, masters: input.masters,
      seats: input.seats, baseSize: input.baseSize,
      activeClients: input.activeClients, answers: input.answers,
      totalMonthly: calc.totalMonthly, totalAnnual: calc.totalAnnual,
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
      revenue: row.revenue, masters: row.masters, seats: row.seats,
      baseSize: row.base_size, activeClients: row.active_clients,
      niche: row.niche, city: row.city, segment: row.segment,
      leadName: row.lead_name, answers
    };
    const calc = calculate(input);
    res.json({ id: row.id, createdAt: row.created_at, leadName: row.lead_name, formData: input, ...calc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads
app.post('/api/leads', async (req, res) => {
  try {
    const d = req.body;
    const { id } = await saveLead({
      name: d.name, telegram: d.telegram, niche: d.niche, city: d.city,
      revenue: Number(d.revenue), masters: Number(d.masters),
      seats: Number(d.seats), baseSize: Number(d.baseSize),
      activeClients: Number(d.activeClients), activeRatePct: Number(d.activeRatePct),
      answers: d.answers || {},
      potentialMonthly: Number(d.potentialMonthly),
      potentialAnnual:  Number(d.potentialAnnual),
      topPains:         d.topPains || [],
      modulesTriggered: d.modulesTriggered || []
    });
    // Асинхронно пишем в Google Sheets (не блокируем ответ)
    getLeads().then(all => {
      const lead = all.find(l => l.id === id);
      if (lead) appendLead(lead);
    }).catch(() => {});

    res.json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-clicked
app.post('/api/lead-clicked', async (req, res) => {
  try {
    const { lead_id } = req.body;
    if (!lead_id) return res.status(400).json({ error: 'lead_id required' });
    await markLeadClickedTg(lead_id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/leads
app.get('/api/admin/leads', async (req, res) => {
  const includeArchived = req.query.archived === 'true';
  try { res.json(await getLeads(includeArchived)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/leads/:id/archive
app.patch('/api/admin/leads/:id/archive', async (req, res) => {
  try {
    const { archived } = req.body;
    if (archived) await archiveLead(req.params.id);
    else          await unarchiveLead(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/leads/:id/results
app.get('/api/admin/leads/:id/results', async (req, res) => {
  try {
    const lead = await getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Не найдено' });

    const answers = JSON.parse(lead.answers || '{}');
    const input = {
      revenue:       lead.revenue,
      masters:       lead.masters,
      seats:         lead.seats,
      baseSize:      lead.base_size,
      activeClients: lead.active_clients,
      niche:         lead.niche,
      city:          lead.city,
      answers
    };
    const calc = calculate(input);
    res.json({ ...calc, formData: { ...input, leadName: lead.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/leads/:id/status
app.patch('/api/admin/leads/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['new', 'contacted', 'scheduled', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Неверный статус' });
    await updateLeadStatus(req.params.id, status);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/leads/:id/manager
app.patch('/api/admin/leads/:id/manager', async (req, res) => {
  try {
    const { manager } = req.body;
    const allowed = [null, '', 'Екатерина', 'Артём'];
    if (!allowed.includes(manager)) return res.status(400).json({ error: 'Неверный менеджер' });
    await updateLeadManager(req.params.id, manager);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/sync-sheets — выгрузить всех лидов в Google Sheets
app.post('/api/admin/sync-sheets', async (req, res) => {
  try {
    const leads = await getLeads(false);
    const result = await syncAllLeads(leads);
    res.json(result);
  } catch (err) {
    console.error('[Sheets] sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Static ──────────────────────────────────────────────────────────────────

if (PROD) {
  const dist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}
// В dev-режиме /manager обрабатывается Vite, в prod — catch-all выше

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 DNA Calculator → http://localhost:${PORT} [${PROD ? 'production' : 'development'}]\n`);
});
