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
