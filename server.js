const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.static(__dirname));

// Sirve jsPDF desde node_modules — sin depender de CDN externos
app.get('/jspdf.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules/jspdf/dist/jspdf.umd.min.js'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ TMB Inspect corriendo en puerto ' + PORT);
});
