// TMB Fichaje — copia de seguridad consistente de la base de datos (también con la app en marcha).
// Uso: node backup.js [carpeta_destino] [días_a_conservar]
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'fichaje.db');
const targetDir = process.argv[2] || path.join(path.dirname(DB_FILE), 'backups');
const keepDays = Number(process.argv[3] || 60);

fs.mkdirSync(targetDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const target = path.join(targetDir, `fichaje-${stamp}.db`);

const db = new DatabaseSync(DB_FILE);
db.prepare('VACUUM INTO ?').run(target);
db.close();
console.log(`Copia creada: ${target}`);

const cutoff = Date.now() - keepDays * 86400000;
for (const name of fs.readdirSync(targetDir)) {
  const file = path.join(targetDir, name);
  if (/^fichaje-.*\.db$/.test(name) && fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file);
}
