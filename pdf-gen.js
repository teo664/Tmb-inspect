// ── CARGA jsPDF con fallback entre varios CDNs ─────────────
async function ensureJsPDF() {
if (window.jspdf && window.jspdf.jsPDF) return;
const cdns = [
‘https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js’,
‘https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js’,
‘https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js’,
];
for (const cdn of cdns) {
try {
await new Promise((resolve, reject) => {
const s = document.createElement(‘script’);
s.src = cdn;
s.onload = resolve;
s.onerror = reject;
s.timeout = 8000;
document.head.appendChild(s);
});
if (window.jspdf && window.jspdf.jsPDF) return;
} catch(e) { continue; }
}
throw new Error(‘No se pudo cargar la librería PDF. Comprueba tu conexión a internet.’);
}

// ── CARGA el logo TMB ──────────────────────────────────────
async function loadLogoBase64() {
try {
const resp = await fetch(’/logo.jpg’);
if (!resp.ok) throw new Error(‘Logo not found’);
const blob = await resp.blob();
return await new Promise(resolve => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result);
reader.readAsDataURL(blob);
});
} catch { return null; }
}

// ── GENERADOR PRINCIPAL ────────────────────────────────────
async function generatePDF(inspection) {
await ensureJsPDF();

const logoBase64 = await loadLogoBase64();
const { jsPDF } = window.jspdf;
const doc = new jsPDF({ unit: ‘mm’, format: ‘a4’, orientation: ‘portrait’ });

const W = doc.internal.pageSize.getWidth();
const H = doc.internal.pageSize.getHeight();
const ML = 15, MR = 15, MT = 15;
let y = MT;

const RED    = [200, 16, 46];
const NAVY   = [31, 45, 61];
const NAVYM  = [44, 62, 80];
const STEEL  = [127, 140, 154];
const WHITE  = [255, 255, 255];
const GREEN  = [26, 158, 92];
const LIGHT  = [244, 246, 248];

const sf = (style, size, color) => {
doc.setFont(‘helvetica’, style);
doc.setFontSize(size);
if (color) doc.setTextColor(…color);
};

const npi = (n = 20) => {
if (y + n > H - 14) { addFtr(); doc.addPage(); y = MT; addPH(); }
};

const addFtr = () => {
const pg = doc.internal.getCurrentPageInfo().pageNumber;
doc.setFillColor(…NAVY); doc.rect(0, H - 11, W, 11, ‘F’);
sf(‘normal’, 7.5, WHITE);
doc.text(‘Technical Maritime Bureau SL  ·  Las Palmas de Gran Canaria  ·  info@technicalmb.net  ·  +34 928 271 172’, ML, H - 4);
doc.text(`Pág. ${pg}`, W - MR, H - 4, { align: ‘right’ });
};

const addPH = () => {
doc.setFillColor(…NAVY); doc.rect(0, 0, W, 12, ‘F’);
doc.setFillColor(…RED);  doc.rect(0, 12, W, 2, ‘F’);
if (logoBase64) {
try { doc.addImage(logoBase64, ‘JPEG’, ML, 1, 9, 9); } catch(e) {}
}
sf(‘bold’, 9, WHITE);
doc.text(‘TMB INSPECT  |  SHIP INSPECTION REPORT’, ML + (logoBase64 ? 12 : 0), 8);
sf(‘normal’, 8, STEEL);
doc.text(`M/V ${inspection.vessel.name || '—'}`, W - MR, 8, { align: ‘right’ });
y = 22;
};

// ── PORTADA ───────────────────────────────────────────────
doc.setFillColor(…RED); doc.rect(0, 0, W, 22, ‘F’);

if (logoBase64) {
try { doc.addImage(logoBase64, ‘JPEG’, ML, 2, 16, 16); } catch(e) {}
sf(‘bold’, 16, WHITE);
doc.text(‘TECHNICAL MARITIME BUREAU SL’, ML + 19, 10);
sf(‘normal’, 7, [255, 200, 200]);
doc.text(‘Las Palmas de Gran Canaria  ·  info@technicalmb.net’, ML + 19, 16);
} else {
sf(‘bold’, 18, WHITE); doc.text(‘TMB’, ML, 13);
sf(‘normal’, 7, [255, 200, 200]); doc.text(‘TECHNICAL MARITIME BUREAU SL’, ML, 19);
}

sf(‘bold’, 15, WHITE);
doc.text(‘SHIP INSPECTION REPORT’, W - MR, 10, { align: ‘right’ });
sf(‘normal’, 8, [255, 200, 200]);
const v = inspection.vessel;
const dateStr = v.date
? new Date(v.date + ‘T12:00:00’).toLocaleDateString(‘en-GB’, { day: ‘2-digit’, month: ‘long’, year: ‘numeric’ })
: ‘—’;
doc.text(dateStr, W - MR, 17, { align: ‘right’ });
doc.setFillColor(…NAVY); doc.rect(0, 22, W, 2, ‘F’);
y = 30;

// ── DATOS DEL BUQUE ───────────────────────────────────────
doc.setFillColor(…NAVY); doc.rect(ML, y, W - ML - MR, 8, ‘F’);
sf(‘bold’, 10, WHITE); doc.text(‘VESSEL INFORMATION’, ML + 4, y + 5.5); y += 10;

const rows = [
[‘Vessel Name’, v.name || ‘—’, ‘Port of Inspection’, v.port || ‘—’],
[‘Flag’, v.flag || ‘—’, ‘IMO / Official No.’, v.imo || ‘—’],
[‘Vessel Type’, v.type || ‘—’, ‘Date of Inspection’, dateStr],
[‘Inspector’, v.inspector || ‘—’, ‘Job Reference’, v.jobRef || ‘—’],
];
const cW = (W - ML - MR) / 4;
rows.forEach((r, i) => {
doc.setFillColor(…(i % 2 === 0 ? LIGHT : WHITE));
doc.rect(ML, y, W - ML - MR, 7, ‘F’);
sf(‘bold’, 7.5, STEEL); doc.text(r[0], ML + 2, y + 2.5);
sf(‘bold’, 9, NAVY);    doc.text(r[1], ML + 2, y + 6);
sf(‘bold’, 7.5, STEEL); doc.text(r[2], ML + cW * 2 + 2, y + 2.5);
sf(‘bold’, 9, NAVY);    doc.text(r[3], ML + cW * 2 + 2, y + 6);
y += 7;
});
y += 6;

// ── RESUMEN CHECKLIST ─────────────────────────────────────
npi(30);
doc.setFillColor(…NAVY); doc.rect(ML, y, W - ML - MR, 8, ‘F’);
sf(‘bold’, 10, WHITE); doc.text(‘INSPECTION CHECKLIST RESULTS’, ML + 4, y + 5.5); y += 10;

let tY = 0, tN = 0, tA = 0, tT = 0;
Object.values(inspection.checklist).forEach(v => {
tT++;
if (v === ‘yes’) tY++; else if (v === ‘no’) tN++; else if (v === ‘na’) tA++;
});

const stats = [
{ l: ‘SATISFACTORY’, v: tY, c: GREEN },
{ l: ‘DEFICIENCY’,   v: tN, c: RED   },
{ l: ‘NOT APPLICABLE’, v: tA, c: STEEL },
{ l: ‘TOTAL ITEMS’,  v: tT, c: NAVY  },
];
const sW = (W - ML - MR) / 4;
stats.forEach((s, i) => {
const x = ML + i * sW;
doc.setFillColor(…LIGHT); doc.rect(x, y, sW - 1, 14, ‘F’);
sf(‘bold’, 18, s.c); doc.text(String(s.v), x + sW / 2 - 0.5, y + 9, { align: ‘center’ });
sf(‘bold’, 6.5, STEEL); doc.text(s.l, x + sW / 2 - 0.5, y + 13, { align: ‘center’ });
});
y += 18;

// ── CHECKLIST POR CATEGORÍA ───────────────────────────────
if (typeof CHECKLIST_DATA !== ‘undefined’) {
CHECKLIST_DATA.forEach(cat => {
const catItems = cat.items.filter(item => inspection.checklist[item.id]);
if (!catItems.length) return;
npi(12);
doc.setFillColor(…NAVYM); doc.rect(ML, y, W - ML - MR, 7, ‘F’);
sf(‘bold’, 9, WHITE); doc.text(cat.title, ML + 3, y + 5); y += 7;
catItems.forEach((item, idx) => {
npi(7);
const val = inspection.checklist[item.id];
doc.setFillColor(…(idx % 2 === 0 ? LIGHT : WHITE));
doc.rect(ML, y, W - ML - MR - 24, 6.5, ‘F’);
let sc = STEEL, st = ‘N/A’;
if (val === ‘yes’) { sc = GREEN; st = ‘SAT ✓’; }
if (val === ‘no’)  { sc = RED;   st = ‘DEF ✗’; }
doc.setFillColor(…sc); doc.rect(W - MR - 22, y, 22, 6.5, ‘F’);
sf(‘normal’, 8, NAVYM);
const lines = doc.splitTextToSize(item.en, W - ML - MR - 32);
doc.text(lines[0], ML + 2, y + 4.5);
sf(‘bold’, 8, WHITE); doc.text(st, W - MR - 11, y + 4.5, { align: ‘center’ });
y += 6.5;
});
y += 3;
});
}

// ── DEFICIENCIAS ──────────────────────────────────────────
const defs = [];
if (typeof CHECKLIST_DATA !== ‘undefined’) {
CHECKLIST_DATA.forEach(cat => cat.items.forEach(item => {
if (inspection.checklist[item.id] === ‘no’) defs.push({ cat: cat.title, text: item.en });
}));
}
if (defs.length) {
npi(20); y += 4;
doc.setFillColor(…RED); doc.rect(ML, y, W - ML - MR, 8, ‘F’);
sf(‘bold’, 10, WHITE); doc.text(`⚠  DEFICIENCIES REQUIRING ATTENTION  (${defs.length})`, ML + 4, y + 5.5); y += 10;
defs.forEach((d, i) => {
npi(8);
doc.setFillColor(…(i % 2 === 0 ? [255, 235, 238] : WHITE));
doc.rect(ML, y, W - ML - MR, 8, ‘F’);
doc.setFillColor(…RED); doc.rect(ML, y, 3, 8, ‘F’);
sf(‘bold’, 7.5, STEEL);
doc.text((d.cat.split(’/’)[1]?.trim() || d.cat).toUpperCase(), ML + 6, y + 3);
sf(‘normal’, 8.5, NAVY);
doc.text(doc.splitTextToSize(d.text, W - ML - MR - 10)[0], ML + 6, y + 6.5);
y += 8;
});
y += 4;
}

// ── FOTOS ─────────────────────────────────────────────────
if (inspection.photos && inspection.photos.length) {
npi(20); y += 2;
doc.setFillColor(…NAVY); doc.rect(ML, y, W - ML - MR, 8, ‘F’);
sf(‘bold’, 10, WHITE);
doc.text(`PHOTOGRAPHIC EVIDENCE  (${inspection.photos.length} photos)`, ML + 4, y + 5.5); y += 12;
const pW = (W - ML - MR - 6) / 2, pH = 46;
let col = 0;
for (const photo of inspection.photos) {
if (col === 0) npi(pH + 10);
const xP = ML + col * (pW + 6);
try { doc.addImage(photo.dataUrl, ‘JPEG’, xP, y, pW, pH, undefined, ‘MEDIUM’); }
catch(e) { doc.setFillColor(…LIGHT); doc.rect(xP, y, pW, pH, ‘F’); }
sf(‘normal’, 7.5, NAVYM);
doc.text(doc.splitTextToSize(photo.caption || `Photo ${inspection.photos.indexOf(photo) + 1}`, pW)[0], xP, y + pH + 4);
col++;
if (col === 2) { col = 0; y += pH + 10; }
}
if (col !== 0) y += pH + 10;
y += 4;
}

// ── MATERIALES ────────────────────────────────────────────
if (inspection.materials && inspection.materials.length) {
npi(20); y += 2;
doc.setFillColor(…NAVY); doc.rect(ML, y, W - ML - MR, 8, ‘F’);
sf(‘bold’, 10, WHITE);
doc.text(`MATERIALS & RESOURCES REQUIRED  (${inspection.materials.length} items)`, ML + 4, y + 5.5); y += 10;
doc.setFillColor(…NAVYM); doc.rect(ML, y, W - ML - MR, 7, ‘F’);
sf(‘bold’, 8, WHITE);
doc.text(’#’, ML + 3, y + 5);
doc.text(‘Description / Material’, ML + 12, y + 5);
doc.text(‘Qty’, W - MR - 33, y + 5, { align: ‘right’ });
doc.text(‘Unit’, W - MR - 8, y + 5, { align: ‘right’ });
y += 7;
inspection.materials.forEach((m, i) => {
npi(7);
doc.setFillColor(…(i % 2 === 0 ? LIGHT : WHITE)); doc.rect(ML, y, W - ML - MR, 7, ‘F’);
sf(‘normal’, 8, NAVYM); doc.text(String(i + 1), ML + 3, y + 4.8);
doc.text(doc.splitTextToSize(m.description || ‘—’, W - ML - MR - 55)[0], ML + 12, y + 4.8);
sf(‘bold’, 8, NAVY); doc.text(String(m.quantity || ‘—’), W - MR - 33, y + 4.8, { align: ‘right’ });
sf(‘normal’, 8, NAVYM); doc.text(m.unit || ‘—’, W - MR - 8, y + 4.8, { align: ‘right’ });
y += 7;
});
y += 4;
}

// ── NOTAS ─────────────────────────────────────────────────
if (inspection.notes && inspection.notes.trim()) {
npi(20); y += 2;
doc.setFillColor(…NAVY); doc.rect(ML, y, W - ML - MR, 8, ‘F’);
sf(‘bold’, 10, WHITE); doc.text(“INSPECTOR’S NOTES & OBSERVATIONS”, ML + 4, y + 5.5); y += 10;
const noteLines = doc.splitTextToSize(inspection.notes, W - ML - MR - 8);
const nH = Math.max(20, noteLines.length * 5 + 8);
doc.setFillColor(…LIGHT); doc.rect(ML, y, W - ML - MR, nH, ‘F’);
doc.setFillColor(…RED); doc.rect(ML, y, 3, nH, ‘F’);
sf(‘normal’, 9, NAVYM); doc.text(noteLines, ML + 7, y + 6);
y += nH + 6;
}

// ── FIRMA ─────────────────────────────────────────────────
npi(35); y += 4;
doc.setFillColor(…LIGHT); doc.rect(ML, y, W - ML - MR, 28, ‘F’);
doc.setFillColor(…NAVY); doc.rect(ML, y, 3, 28, ‘F’);
sf(‘bold’, 9, NAVY); doc.text(“INSPECTOR’S DECLARATION”, ML + 7, y + 6);
sf(‘normal’, 8, NAVYM);
doc.text(‘I hereby certify that this inspection was carried out in accordance with TMB procedures and that’, ML + 7, y + 11);
doc.text(‘the information contained herein is accurate and complete to the best of my knowledge.’, ML + 7, y + 15.5);
sf(‘bold’, 8, NAVY); doc.text(‘Inspector:’, ML + 7, y + 22);
sf(‘normal’, 8, NAVYM); doc.text(v.inspector || ‘—’, ML + 28, y + 22);
doc.setFillColor(…NAVY); doc.rect(W - MR - 60, y + 17, 60, 0.5, ‘F’);
sf(‘normal’, 7, STEEL); doc.text(‘Signature’, W - MR - 30, y + 22, { align: ‘center’ });

// Pie de página en todas las páginas
const total = doc.internal.getNumberOfPages();
for (let i = 1; i <= total; i++) { doc.setPage(i); addFtr(); }

return doc;
}
