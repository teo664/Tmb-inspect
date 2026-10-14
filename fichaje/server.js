// TMB Fichaje — servidor
const path = require('path');
const express = require('express');
const compression = require('compression');
const { openDatabase, ensureAdmin } = require('./db');
const { createApi } = require('./api');

const createApp = (db) => {
  const app = express();
  // Solo se confía en la IP que envía un proxy de la red local (Caddy en Docker), no en cualquier cliente.
  app.set('trust proxy', 'loopback, uniquelocal');
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'X-Frame-Options': 'DENY',
    });
    next();
  });
  app.use(compression());
  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use(express.json({ limit: '200kb' }));
  app.use('/api', createApi(db));
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
  return app;
};

if (require.main === module) {
  const PORT = process.env.PORT || 3100;
  const db = openDatabase(process.env.DB_FILE || path.join(__dirname, 'data', 'fichaje.db'));
  const generated = ensureAdmin(db, process.env.ADMIN_USER || 'admin', process.env.ADMIN_PASSWORD);
  if (generated) console.log(`🔑 Administrador inicial creado → usuario: ${process.env.ADMIN_USER || 'admin'}  contraseña: ${generated}`);
  createApp(db).listen(PORT, '0.0.0.0', () => console.log(`✅ TMB Fichaje corriendo en http://localhost:${PORT}`));
}

module.exports = { createApp };
