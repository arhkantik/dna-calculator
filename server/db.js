'use strict';

const fs   = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'diagnostics.json');

function load() {
  if (!fs.existsSync(DB_FILE)) return { records: [], nextId: 1 };
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { records: [], nextId: 1 }; }
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function saveDiagnostic(d) {
  const db  = load();
  const id  = db.nextId;
  const rec = {
    id,
    created_at:              new Date().toISOString(),
    lead_name:               d.leadName,
    segment:                 d.segment,
    niche:                   d.niche,
    city:                    d.city,
    revenue:                 d.revenue,
    masters:                 d.masters,
    seats:                   d.seats,
    base_size:               d.baseSize,
    active_clients:          d.activeClients,
    answers:                 JSON.stringify(d.answers),
    total_potential_monthly: d.totalMonthly,
    total_potential_annual:  d.totalAnnual,
    generated_message:       d.generatedMessage
  };
  db.records.unshift(rec);
  db.nextId = id + 1;
  save(db);
  return id;
}

function getHistory() {
  const { records } = load();
  return records.slice(0, 20).map(r => ({
    id:                      r.id,
    created_at:              r.created_at,
    lead_name:               r.lead_name,
    segment:                 r.segment,
    niche:                   r.niche,
    city:                    r.city,
    revenue:                 r.revenue,
    total_potential_monthly: r.total_potential_monthly,
    total_potential_annual:  r.total_potential_annual
  }));
}

function getDiagnosticById(id) {
  const { records } = load();
  return records.find(r => r.id === Number(id)) || null;
}

module.exports = { saveDiagnostic, getHistory, getDiagnosticById };
