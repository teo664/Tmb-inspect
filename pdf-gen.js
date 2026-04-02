// PDF Generator for TMB Inspect
// Uses jsPDF loaded from CDN

async function loadLogoBase64() {
  try {
    const resp = await fetch('/icons/logo.jpg');
    const blob = await resp.blob();
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function generatePDF(inspection) {
  const logoBase64 = await loadLogoBase64();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ML = 15, MR = 15, MT = 15;
  let y = MT;

  const RED = [200, 16, 46];
  const NAVY = [31, 45, 61];
  const NAVY_MID = [44, 62, 80];
  const STEEL = [127, 140, 154];
  const WHITE = [255, 255, 255];
  const GREEN = [26, 158, 92];
  const LIGHT = [244, 246, 248];
  const BORDER = [213, 220, 228];
  const AMBER = [230, 126, 34];

  function setFont(style, size, color) {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    if (color) doc.setTextColor(...color);
  }

  function newPageIfNeeded(needed = 20) {
    if (y + needed > H - 15) {
      addFooter();
      doc.addPage();
      y = MT;
      addPageHeader();
    }
  }

  function addFooter() {
    const pg = doc.internal.getCurrentPageInfo().pageNumber;
    doc.setFillColor(...NAVY);
    doc.rect(0, H - 12, W, 12, 'F');
    setFont('normal', 8, WHITE);
    doc.text('Technical Maritime Bureau SL  |  Las Palmas de Gran Canaria  |  info@technicalmb.net  |  +34 928 271 172', ML, H - 4.5);
    doc.text(`Page ${pg}`, W - MR, H - 4.5, { align: 'right' });
  }

  function addPageHeader() {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 12, 'F');
    doc.setFillColor(...RED);
    doc.rect(0, 12, W, 2, 'F');
    // Small logo on subsequent pages
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'JPEG', ML, 1, 9, 9); } catch(e) {}
    }
    setFont('bold', 9, WHITE);
    doc.text('TMB INSPECT  |  SHIP INSPECTION REPORT', ML + (logoBase64 ? 12 : 0), 8);
    setFont('normal', 8, STEEL);
    const vName = inspection.vessel.name || '—';
    doc.text(`M/V ${vName}`, W - MR, 8, { align: 'right' });
    y = 22;
  }

  // ── FIRST PAGE: MAIN HEADER ─────────────────────────────
  // Red top bar
  doc.setFillColor(...RED);
  doc.rect(0, 0, W, 22, 'F');

  // TMB Logo (real image)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'JPEG', ML, 1, 18, 18);
    } catch (e) {
      // fallback text
      setFont('bold', 18, WHITE);
      doc.text('TMB', ML, 14);
    }
  } else {
    setFont('bold', 18, WHITE);
    doc.text('TMB', ML, 14);
  }

  setFont('normal', 7, [255, 200, 200]);
  doc.text('TECHNICAL MARITIME BUREAU SL', ML + 21, 10);
  setFont('normal', 6.5, [255, 200, 200]);
  doc.text('Las Palmas de Gran Canaria  ·  info@technicalmb.net  ·  +34 928 271 172', ML + 21, 15);

  // Report title on red
  setFont('bold', 16, WHITE);
  doc.text('SHIP INSPECTION REPORT', W - MR, 10, { align: 'right' });
  setFont('normal', 8, [255, 200, 200]);
  const dateStr = inspection.vessel.date ? new Date(inspection.vessel.date + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  doc.text(dateStr, W - MR, 17, { align: 'right' });

  // Navy bar below red
  doc.setFillColor(...NAVY);
  doc.rect(0, 22, W, 2, 'F');
  y = 30;

  // ── VESSEL INFO BOX ─────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(ML, y, W - ML - MR, 8, 'F');
  setFont('bold', 10, WHITE);
  doc.text('VESSEL INFORMATION', ML + 4, y + 5.5);
  y += 10;

  const v = inspection.vessel;
  const infoRows = [
    ['Vessel Name', v.name || '—', 'Port of Inspection', v.port || '—'],
    ['Flag', v.flag || '—', 'IMO / Official No.', v.imo || '—'],
    ['Vessel Type', v.type || '—', 'Date of Inspection', dateStr],
    ['Inspector', v.inspector || '—', 'Job Reference', v.jobRef || '—'],
  ];

  const colW = (W - ML - MR) / 4;
  infoRows.forEach((row, i) => {
    const bg = i % 2 === 0 ? LIGHT : WHITE;
    doc.setFillColor(...bg);
    doc.rect(ML, y, W - ML - MR, 7, 'F');

    setFont('bold', 7.5, STEEL);
    doc.text(row[0], ML + 2, y + 2.5);
    setFont('bold', 9, NAVY);
    doc.text(row[1], ML + 2, y + 6);

    setFont('bold', 7.5, STEEL);
    doc.text(row[2], ML + colW * 2 + 2, y + 2.5);
    setFont('bold', 9, NAVY);
    doc.text(row[3], ML + colW * 2 + 2, y + 6);

    y += 7;
  });
  y += 6;

  // ── CHECKLIST SUMMARY ────────────────────────────────────
  newPageIfNeeded(30);
  doc.setFillColor(...NAVY);
  doc.rect(ML, y, W - ML - MR, 8, 'F');
  setFont('bold', 10, WHITE);
  doc.text('INSPECTION CHECKLIST RESULTS', ML + 4, y + 5.5);
  y += 10;

  // Count totals
  let totalYes = 0, totalNo = 0, totalNa = 0, totalItems = 0;
  Object.values(inspection.checklist).forEach(v => {
    totalItems++;
    if (v === 'yes') totalYes++;
    else if (v === 'no') totalNo++;
    else if (v === 'na') totalNa++;
  });

  // Summary stats row
  const summaryW = (W - ML - MR) / 4;
  const statsData = [
    { label: 'SATISFACTORY', val: totalYes, color: GREEN },
    { label: 'DEFICIENCY', val: totalNo, color: RED },
    { label: 'NOT APPLICABLE', val: totalNa, color: STEEL },
    { label: 'TOTAL ITEMS', val: totalItems, color: NAVY },
  ];

  statsData.forEach((s, i) => {
    const x = ML + i * summaryW;
    doc.setFillColor(...LIGHT);
    doc.rect(x, y, summaryW - 1, 14, 'F');
    doc.setTextColor(...s.color);
    setFont('bold', 18, s.color);
    doc.text(String(s.val), x + summaryW / 2 - 0.5, y + 9, { align: 'center' });
    setFont('bold', 6.5, STEEL);
    doc.text(s.label, x + summaryW / 2 - 0.5, y + 13, { align: 'center' });
  });
  y += 18;

  // Per-category table
  CHECKLIST_DATA.forEach(cat => {
    const catItems = cat.items.filter(item => inspection.checklist[item.id]);
    if (catItems.length === 0) return;

    newPageIfNeeded(12);

    // Category header
    doc.setFillColor(...NAVY_MID);
    doc.rect(ML, y, W - ML - MR, 7, 'F');
    setFont('bold', 9, WHITE);
    doc.text(`${cat.title}`, ML + 3, y + 5);
    y += 7;

    catItems.forEach((item, idx) => {
      newPageIfNeeded(7);
      const val = inspection.checklist[item.id];
      const bg = idx % 2 === 0 ? LIGHT : WHITE;
      doc.setFillColor(...bg);
      doc.rect(ML, y, W - ML - MR - 25, 6.5, 'F');

      // Status badge
      let statusColor = STEEL, statusText = 'N/A';
      if (val === 'yes') { statusColor = GREEN; statusText = 'SAT ✓'; }
      if (val === 'no')  { statusColor = RED;   statusText = 'DEF ✗'; }

      doc.setFillColor(...statusColor);
      doc.rect(W - MR - 22, y, 22, 6.5, 'F');

      setFont('normal', 8, NAVY_MID);
      const lines = doc.splitTextToSize(item.en, W - ML - MR - 32);
      doc.text(lines[0], ML + 2, y + 4.5);

      setFont('bold', 8, WHITE);
      doc.text(statusText, W - MR - 11, y + 4.5, { align: 'center' });
      y += 6.5;
    });
    y += 3;
  });

  // ── DEFICIENCIES SUMMARY ─────────────────────────────────
  const defItems = [];
  CHECKLIST_DATA.forEach(cat => {
    cat.items.forEach(item => {
      if (inspection.checklist[item.id] === 'no') {
        defItems.push({ cat: cat.title, text: item.en });
      }
    });
  });

  if (defItems.length > 0) {
    newPageIfNeeded(20);
    y += 4;
    doc.setFillColor(...RED);
    doc.rect(ML, y, W - ML - MR, 8, 'F');
    setFont('bold', 10, WHITE);
    doc.text(`⚠  DEFICIENCIES REQUIRING ATTENTION  (${defItems.length})`, ML + 4, y + 5.5);
    y += 10;

    defItems.forEach((d, i) => {
      newPageIfNeeded(8);
      doc.setFillColor(i % 2 === 0 ? [255, 235, 238] : WHITE);
      doc.rect(ML, y, W - ML - MR, 8, 'F');
      doc.setFillColor(...RED);
      doc.rect(ML, y, 3, 8, 'F');
      setFont('bold', 7.5, STEEL);
      const catShort = d.cat.split('/')[1]?.trim() || d.cat;
      doc.text(catShort.toUpperCase(), ML + 6, y + 3);
      setFont('normal', 8.5, NAVY);
      const wrapped = doc.splitTextToSize(d.text, W - ML - MR - 10);
      doc.text(wrapped[0], ML + 6, y + 6.5);
      y += 8;
    });
    y += 4;
  }

  // ── PHOTOS ───────────────────────────────────────────────
  if (inspection.photos && inspection.photos.length > 0) {
    newPageIfNeeded(20);
    y += 2;
    doc.setFillColor(...NAVY);
    doc.rect(ML, y, W - ML - MR, 8, 'F');
    setFont('bold', 10, WHITE);
    doc.text(`PHOTOGRAPHIC EVIDENCE  (${inspection.photos.length} photos)`, ML + 4, y + 5.5);
    y += 12;

    const photoW = (W - ML - MR - 6) / 2;
    const photoH = 48;
    let col = 0;

    for (const photo of inspection.photos) {
      if (col === 0) newPageIfNeeded(photoH + 10);

      const xPos = ML + col * (photoW + 6);

      try {
        doc.addImage(photo.dataUrl, 'JPEG', xPos, y, photoW, photoH, undefined, 'MEDIUM');
      } catch (e) {
        doc.setFillColor(...LIGHT);
        doc.rect(xPos, y, photoW, photoH, 'F');
        setFont('normal', 10, STEEL);
        doc.text('Photo', xPos + photoW / 2, y + photoH / 2, { align: 'center' });
      }

      // Caption
      setFont('normal', 7.5, NAVY_MID);
      const caption = photo.caption || `Photo ${inspection.photos.indexOf(photo) + 1}`;
      const captionLines = doc.splitTextToSize(caption, photoW);
      doc.text(captionLines[0], xPos, y + photoH + 4);

      col++;
      if (col === 2) {
        col = 0;
        y += photoH + 10;
      }
    }
    if (col !== 0) y += photoH + 10;
    y += 4;
  }

  // ── MATERIALS ────────────────────────────────────────────
  if (inspection.materials && inspection.materials.length > 0) {
    newPageIfNeeded(20);
    y += 2;
    doc.setFillColor(...NAVY);
    doc.rect(ML, y, W - ML - MR, 8, 'F');
    setFont('bold', 10, WHITE);
    doc.text(`MATERIALS & RESOURCES REQUIRED  (${inspection.materials.length} items)`, ML + 4, y + 5.5);
    y += 10;

    // Table header
    doc.setFillColor(...NAVY_MID);
    doc.rect(ML, y, W - ML - MR, 7, 'F');
    setFont('bold', 8, WHITE);
    doc.text('#', ML + 3, y + 5);
    doc.text('Description / Material', ML + 12, y + 5);
    doc.text('Qty', W - MR - 35, y + 5, { align: 'right' });
    doc.text('Unit', W - MR - 10, y + 5, { align: 'right' });
    y += 7;

    inspection.materials.forEach((mat, i) => {
      newPageIfNeeded(7);
      doc.setFillColor(i % 2 === 0 ? LIGHT : WHITE);
      doc.rect(ML, y, W - ML - MR, 7, 'F');
      setFont('normal', 8, NAVY_MID);
      doc.text(String(i + 1), ML + 3, y + 4.8);
      const desc = doc.splitTextToSize(mat.description || '—', W - ML - MR - 55);
      doc.text(desc[0], ML + 12, y + 4.8);
      setFont('bold', 8, NAVY);
      doc.text(String(mat.quantity || '—'), W - MR - 35, y + 4.8, { align: 'right' });
      setFont('normal', 8, NAVY_MID);
      doc.text(mat.unit || '—', W - MR - 10, y + 4.8, { align: 'right' });
      y += 7;
    });
    y += 4;
  }

  // ── NOTES ────────────────────────────────────────────────
  if (inspection.notes && inspection.notes.trim()) {
    newPageIfNeeded(20);
    y += 2;
    doc.setFillColor(...NAVY);
    doc.rect(ML, y, W - ML - MR, 8, 'F');
    setFont('bold', 10, WHITE);
    doc.text('INSPECTOR\'S NOTES & OBSERVATIONS', ML + 4, y + 5.5);
    y += 10;

    doc.setFillColor(...LIGHT);
    const noteLines = doc.splitTextToSize(inspection.notes, W - ML - MR - 8);
    const noteH = Math.max(20, noteLines.length * 5 + 8);
    doc.rect(ML, y, W - ML - MR, noteH, 'F');
    doc.setFillColor(...RED);
    doc.rect(ML, y, 3, noteH, 'F');
    setFont('normal', 9, NAVY_MID);
    doc.text(noteLines, ML + 7, y + 6);
    y += noteH + 6;
  }

  // ── SIGNATURE BLOCK ──────────────────────────────────────
  newPageIfNeeded(35);
  y += 4;
  doc.setFillColor(...LIGHT);
  doc.rect(ML, y, W - ML - MR, 28, 'F');
  doc.setFillColor(...NAVY);
  doc.rect(ML, y, 3, 28, 'F');

  setFont('bold', 9, NAVY);
  doc.text('INSPECTOR\'S DECLARATION', ML + 7, y + 6);
  setFont('normal', 8, NAVY_MID);
  doc.text('I hereby certify that this inspection was carried out in accordance with TMB procedures and that the', ML + 7, y + 11);
  doc.text('information contained herein is accurate and complete to the best of my knowledge.', ML + 7, y + 15.5);

  setFont('bold', 8, NAVY);
  doc.text('Inspector:', ML + 7, y + 22);
  setFont('normal', 8, NAVY_MID);
  doc.text(v.inspector || '—', ML + 28, y + 22);

  doc.setFillColor(...NAVY);
  doc.rect(W - MR - 60, y + 17, 60, 0.5, 'F');
  setFont('normal', 7, STEEL);
  doc.text('Signature', W - MR - 60 + 30, y + 22, { align: 'center' });
  y += 34;

  // Footer on last page
  addFooter();

  // Add footer to all pages except last (already done)
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i < totalPages; i++) {
    doc.setPage(i);
    addFooter();
  }

  return doc;
}
