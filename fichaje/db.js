// TMB Fichaje — base de datos (SQLite integrado en Node)
const { DatabaseSync } = require('node:sqlite');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  full_name TEXT NOT NULL,
  doc_id TEXT NOT NULL DEFAULT '',
  rank TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'worker')),
  company_id INTEGER NOT NULL REFERENCES companies(id),
  lang TEXT NOT NULL DEFAULT 'es',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS work_orders (
  id INTEGER PRIMARY KEY,
  ot_number TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT '',
  vessel TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  imo TEXT NOT NULL DEFAULT '',
  flag TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  work_order_id INTEGER NOT NULL REFERENCES work_orders(id),
  assigned_at TEXT NOT NULL,
  assigned_by INTEGER REFERENCES users(id),
  removed_at TEXT,
  removed_by INTEGER REFERENCES users(id),
  is_foreman INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_assignment
  ON assignments(user_id, work_order_id) WHERE removed_at IS NULL;
CREATE TABLE IF NOT EXISTS time_entries (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  work_order_id INTEGER NOT NULL REFERENCES work_orders(id),
  start_at TEXT NOT NULL,
  end_at TEXT,
  source TEXT NOT NULL DEFAULT 'clock' CHECK (source IN ('clock', 'manual')),
  place TEXT NOT NULL DEFAULT 'board' CHECK (place IN ('board', 'workshop')),
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified')),
  verified_by INTEGER REFERENCES users(id),
  verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by INTEGER REFERENCES users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_entry
  ON time_entries(user_id) WHERE end_at IS NULL;
CREATE INDEX IF NOT EXISTS entries_by_start ON time_entries(start_at);
CREATE TABLE IF NOT EXISTS holidays (
  date TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  at TEXT NOT NULL
);
`;

const COMPANIES = [
  ['TMB', 'Technical Maritime Bureau SL'],
  ['SSPT', 'SSPT'],
  ['UNICREW', 'UNICREW'],
];

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, stored) => {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
};

// Columnas añadidas después de la primera versión: se crean en bases de datos ya existentes.
const MIGRATIONS = [
  ['time_entries', 'place', "TEXT NOT NULL DEFAULT 'board' CHECK (place IN ('board', 'workshop'))"],
  ['assignments', 'is_foreman', 'INTEGER NOT NULL DEFAULT 0'],
  ['users', 'rank', "TEXT NOT NULL DEFAULT ''"],
  ['work_orders', 'imo', "TEXT NOT NULL DEFAULT ''"],
  ['work_orders', 'flag', "TEXT NOT NULL DEFAULT ''"],
];

const migrate = (db) => {
  for (const [table, column, definition] of MIGRATIONS) {
    const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
    if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

const openDatabase = (file) => {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  migrate(db);
  const insertCompany = db.prepare('INSERT OR IGNORE INTO companies (code, name) VALUES (?, ?)');
  for (const [code, name] of COMPANIES) insertCompany.run(code, name);
  return db;
};

// Crea el primer administrador si no existe ninguno. Devuelve la contraseña generada, o null.
const ensureAdmin = (db, username, password) => {
  const existing = db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existing) return null;
  const finalPassword = password || crypto.randomBytes(6).toString('base64url');
  const tmb = db.prepare("SELECT id FROM companies WHERE code = 'TMB'").get();
  db.prepare(`INSERT INTO users (username, full_name, password_hash, role, company_id, created_at)
              VALUES (?, ?, ?, 'admin', ?, ?)`)
    .run(username, 'Administrador TMB', hashPassword(finalPassword), tmb.id, new Date().toISOString());
  return finalPassword;
};

const transaction = (db, work) => {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

module.exports = { openDatabase, ensureAdmin, hashPassword, verifyPassword, transaction };
