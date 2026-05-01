'use strict';

// Используем PostgreSQL если DATABASE_URL задан (Railway), иначе SQLite локально
const USE_PG = !!process.env.DATABASE_URL;

let pool, db;

if (USE_PG) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id                SERIAL PRIMARY KEY,
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      name              TEXT,
      telegram          TEXT,
      niche             TEXT,
      city              TEXT,
      revenue           INTEGER,
      masters           INTEGER,
      seats             INTEGER,
      base_size         INTEGER,
      active_clients    INTEGER,
      active_rate_pct   NUMERIC,
      answers           TEXT,
      potential_monthly INTEGER,
      potential_annual  INTEGER,
      top_pains         TEXT,
      modules_triggered TEXT,
      status            TEXT DEFAULT 'new',
      clicked_tg        BOOLEAN DEFAULT FALSE,
      clicked_tg_at     TIMESTAMPTZ,
      manager           TEXT
    )
  `).catch(console.error);

} else {
  const path     = require('path');
  const Database = require('better-sqlite3');
  db = new Database(path.join(__dirname, 'leads.db'));

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
      clicked_tg_at     TEXT,
      manager           TEXT
    )
  `);
  try { db.exec(`ALTER TABLE leads ADD COLUMN clicked_tg INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE leads ADD COLUMN clicked_tg_at TEXT`); } catch {}
  try { db.exec(`ALTER TABLE leads ADD COLUMN manager TEXT`); } catch {}
}

// ─── saveLead ────────────────────────────────────────────────────────────────

async function saveLead(d) {
  if (USE_PG) {
    const res = await pool.query(
      `INSERT INTO leads
        (name, telegram, niche, city, revenue, masters, seats, base_size,
         active_clients, active_rate_pct, answers, potential_monthly,
         potential_annual, top_pains, modules_triggered)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        d.name, d.telegram, d.niche, d.city,
        d.revenue, d.masters, d.seats, d.baseSize,
        d.activeClients, d.activeRatePct,
        JSON.stringify(d.answers || {}),
        d.potentialMonthly, d.potentialAnnual,
        JSON.stringify(d.topPains || []),
        JSON.stringify(d.modulesTriggered || [])
      ]
    );
    return { id: res.rows[0].id };
  } else {
    const result = db.prepare(`
      INSERT INTO leads
        (name, telegram, niche, city, revenue, masters, seats, base_size,
         active_clients, active_rate_pct, answers, potential_monthly,
         potential_annual, top_pains, modules_triggered)
      VALUES
        (@name,@telegram,@niche,@city,@revenue,@masters,@seats,@base_size,
         @active_clients,@active_rate_pct,@answers,@potential_monthly,
         @potential_annual,@top_pains,@modules_triggered)
    `).run({
      name: d.name, telegram: d.telegram, niche: d.niche, city: d.city,
      revenue: d.revenue, masters: d.masters, seats: d.seats,
      base_size: d.baseSize, active_clients: d.activeClients,
      active_rate_pct: d.activeRatePct,
      answers: JSON.stringify(d.answers || {}),
      potential_monthly: d.potentialMonthly, potential_annual: d.potentialAnnual,
      top_pains: JSON.stringify(d.topPains || []),
      modules_triggered: JSON.stringify(d.modulesTriggered || [])
    });
    return { id: result.lastInsertRowid };
  }
}

// ─── getLeads ────────────────────────────────────────────────────────────────

async function getLeads() {
  if (USE_PG) {
    const res = await pool.query('SELECT * FROM leads ORDER BY id DESC');
    return res.rows;
  } else {
    return db.prepare('SELECT * FROM leads ORDER BY id DESC').all();
  }
}

// ─── getLeadById ─────────────────────────────────────────────────────────────

async function getLeadById(id) {
  if (USE_PG) {
    const res = await pool.query('SELECT * FROM leads WHERE id = $1', [Number(id)]);
    return res.rows[0] || null;
  } else {
    return db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(id)) || null;
  }
}

// ─── updateLeadStatus ────────────────────────────────────────────────────────

async function updateLeadStatus(id, status) {
  if (USE_PG) {
    await pool.query('UPDATE leads SET status = $1 WHERE id = $2', [status, Number(id)]);
  } else {
    db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, Number(id));
  }
}

// ─── markLeadClickedTg ───────────────────────────────────────────────────────

async function markLeadClickedTg(id) {
  if (USE_PG) {
    await pool.query(
      'UPDATE leads SET clicked_tg = TRUE, clicked_tg_at = NOW() WHERE id = $1',
      [Number(id)]
    );
  } else {
    db.prepare(
      `UPDATE leads SET clicked_tg = 1, clicked_tg_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`
    ).run(Number(id));
  }
}

// ─── updateLeadManager ───────────────────────────────────────────────────────

async function updateLeadManager(id, manager) {
  if (USE_PG) {
    await pool.query(
      'UPDATE leads SET manager = $1 WHERE id = $2',
      [manager || null, Number(id)]
    );
  } else {
    db.prepare('UPDATE leads SET manager = ? WHERE id = ?').run(manager || null, Number(id));
  }
}

module.exports = { saveLead, getLeads, getLeadById, updateLeadStatus, markLeadClickedTg, updateLeadManager };
