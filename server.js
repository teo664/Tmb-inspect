const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.static(__dirname));

const routes = {
  '/css/style.css':      'style.css',
  '/js/app.js':          'app.js',
  '/js/checklist.js':    'checklist.js',
  '/js/pdf-gen.js':      'pdf-gen.js',
  '/icons/logo.jpg':     'logo.jpg',
  '/icons/icon-192.png': 'icon-192.png',
  '/icons/icon-512.png': 'icon-512.png',
};

Object.entries(routes).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, file));
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('TMB Inspect corriendo en puerto ' + PORT);
});
