const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { openDatabase } = require('../db');

test('una base de datos de la primera versión recibe las columnas nuevas', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fichaje-')), 'old.db');
  const old = new DatabaseSync(file);
  old.exec(`CREATE TABLE assignments (id INTEGER PRIMARY KEY, user_id INTEGER, work_order_id INTEGER, assigned_at TEXT,
    assigned_by INTEGER, removed_at TEXT, removed_by INTEGER);
    CREATE TABLE time_entries (id INTEGER PRIMARY KEY, user_id INTEGER, work_order_id INTEGER, start_at TEXT, end_at TEXT);
    INSERT INTO time_entries (user_id, work_order_id, start_at) VALUES (1, 1, '2026-10-01T07:00:00Z');`);
  old.close();

  const db = openDatabase(file);
  assert.equal(db.prepare('SELECT place FROM time_entries').get().place, 'board');
  assert.ok(db.prepare('PRAGMA table_info(assignments)').all().some((c) => c.name === 'is_foreman'));
});

test('una base de datos anterior admite encargados y fichajes rechazados sin perder datos', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fichaje-')), 'old.db');
  const first = openDatabase(file);
  const tmb = first.prepare("SELECT id FROM companies WHERE code = 'TMB'").get().id;
  first.close();
  // Simula el esquema de la versión anterior, con los CHECK antiguos.
  const old = new DatabaseSync(file);
  old.exec(`PRAGMA foreign_keys = OFF;
    DROP TABLE users; DROP TABLE time_entries;
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, full_name TEXT NOT NULL,
      doc_id TEXT NOT NULL DEFAULT '', rank TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'worker')), company_id INTEGER NOT NULL REFERENCES companies(id),
      lang TEXT NOT NULL DEFAULT 'es', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
    CREATE TABLE time_entries (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
      work_order_id INTEGER NOT NULL REFERENCES work_orders(id), start_at TEXT NOT NULL, end_at TEXT,
      source TEXT NOT NULL DEFAULT 'clock', place TEXT NOT NULL DEFAULT 'board', note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified')), verified_by INTEGER, verified_at TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by INTEGER);
    INSERT INTO users (id, username, full_name, password_hash, role, company_id, created_at) VALUES (7, 'ivan', 'Ivan', 'x:y', 'worker', ${tmb}, 'now');
    INSERT INTO work_orders (id, ot_number, description, created_at) VALUES (3, 'OT-1', 'Casco', 'now');
    INSERT INTO time_entries (user_id, work_order_id, start_at, end_at, status, created_at, updated_at)
      VALUES (7, 3, '2026-10-01T07:00:00Z', '2026-10-01T15:00:00Z', 'verified', 'now', 'now');`);
  old.close();

  const db = openDatabase(file);
  db.prepare("UPDATE users SET role = 'supervisor' WHERE id = 7").run();
  db.prepare("UPDATE time_entries SET status = 'rejected', review_note = 'mal' WHERE user_id = 7").run();
  const entry = db.prepare('SELECT * FROM time_entries').get();
  assert.equal(entry.status, 'rejected');
  assert.equal(entry.end_at, '2026-10-01T15:00:00Z');
  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'one_open_entry'").get());
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
});
