'use strict';

const path     = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'leads.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at        TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    name              TEXT,
    telegram          TEXT,
    niche             TEXT,
    city              TEXT,
    revenue           INTEGER,
    masters           INTEGER,
    seats             INTEGER,
    base_size         INTEGER,
    active_clients    INTEGER,
    active_rate_pct   INTEGER,
    answers           TEXT,
    potential_monthly INTEGER,
    potential_annual  INTEGER,
    top_pains         TEXT,
    modules_triggered TEXT,
    status            TEXT DEFAULT 'new',
    clicked_tg        INTEGER DEFAULT 0,
    clicked_tg_at     TEXT
  )
`);

// Миграция: добавляем поля если таблица уже существует без них
try { db.exec(`ALTER TABLE leads ADD COLUMN clicked_tg INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE leads ADD COLUMN clicked_tg_at TEXT`); } catch {}

const insertStmt = db.prepare(`
  INSERT INTO leads
    (name, telegram, niche, city, revenue, masters, seats, base_size,
     active_clients, active_rate_pct, answers, potential_monthly,
     potential_annual, top_pains, modules_triggered)
  VALUES
    (@name, @telegram, @niche, @city, @revenue, @masters, @seats, @base_size,
     @active_clients, @active_rate_pct, @answers, @potential_monthly,
     @potential_annual, @top_pains, @modules_triggered)
`);

function saveLead(d) {
  const result = insertStmt.run({
    name:              d.name,
    telegram:          d.telegram,
    niche:             d.niche,
    city:              d.city,
    revenue:           d.revenue,
    masters:           d.masters,
    seats:             d.seats,
    base_size:         d.baseSize,
    active_clients:    d.activeClients,
    active_rate_pct:   d.activeRatePct,
    answers:           JSON.stringify(d.answers || {}),
    potential_monthly: d.potentialMonthly,
    potential_annual:  d.potentialAnnual,
    top_pains:         JSON.stringify(d.topPains || []),
    modules_triggered: JSON.stringify(d.modulesTriggered || [])
  });
  return result.lastInsertRowid;
}

function getLeads() {
  return db.prepare('SELECT * FROM leads ORDER BY id DESC').all();
}

function getLeadById(id) {
  return db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(id));
}

function updateLeadStatus(id, status) {
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, Number(id));
}

function markLeadClickedTg(id) {
  db.prepare(
    `UPDATE leads SET clicked_tg = 1, clicked_tg_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`
  ).run(Number(id));
}

module.exports = { saveLead, getLeads, getLeadById, updateLeadStatus, markLeadClickedTg };
