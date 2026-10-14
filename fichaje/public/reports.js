// TMB Fichaje — documentos imprimibles.
// Time sheet de cliente y hojas mensuales de SSPT y UNICREW con sus formatos oficiales.

const csvCell = (value) => {
  const text = String(value ?? '');
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (rows) => rows.map((row) => row.map(csvCell).join(';')).join('\r\n');

const downloadCsv = (name, csv) => {
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};

const writeReportWindow = (win, html) => {
  win.document.open();
  win.document.write(html);
  win.document.close();
};

// ── Time sheet para el cliente (formato oficial TMB, en inglés) ──
const TIMESHEET_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #555; margin: 0; padding: 24px 40px; }
  .toolbar { margin-bottom: 16px; }
  .toolbar button { font-size: 14px; padding: 8px 16px; cursor: pointer; }
  .logo { height: 112px; display: block; margin-left: 4px; }
  .heading { display: flex; justify-content: space-between; align-items: baseline; margin: 18px 0 22px 14px; }
  .heading h1 { font-size: 22px; margin: 0; color: #555; }
  .job-title { font-size: 13px; font-weight: 700; margin: 0 0 6px 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  th { font-weight: 400; color: #555; padding: 3px 4px; text-align: center; }
  thead tr.groups th { border-top: 1px solid #e3e9f2; }
  thead tr.groups th.group { border-left: 1px solid #e3e9f2; }
  thead tr.cols th { border: 1px solid #e3e9f2; border-top: none; }
  thead tr.cols th.worker, thead tr.cols th.date { border-left: none; border-right: none; }
  th.worker { width: 34%; }
  th.total { font-weight: 700; }
  tbody td { padding: 3px 4px; text-align: center; border-left: 1px solid #fff; }
  tbody tr.shaded td { background: #e1e9fb; color: #3d5f9f; }
  tbody td.worker { text-align: left; }
  tbody td.date { text-align: right; padding-right: 6px; }
  td.total { font-weight: 700; color: #555 !important; }
  tbody tr.spacer td { background: #fff !important; height: 8px; padding: 0; }
  tfoot td { font-weight: 700; text-align: center; padding: 6px 4px; border-top: 1px solid #e3e9f2; border-bottom: 1px solid #e3e9f2; }
  tfoot td.label { text-align: right; padding-right: 96px; }
  .warning { background: #fdf3e7; border-left: 4px solid #e67e22; padding: 8px 10px; margin: 0 0 12px 10px; font-size: 12px; }
  @media print { .toolbar { display: none; } body { padding: 0; } @page { size: A4 landscape; margin: 10mm 12mm; } }
`;

const timesheetDate = (dayKey) => dayKey.split('-').reverse().join('-');
const TIMESHEET_CATEGORIES = ['normal', 'overtime', 'holiday', 'night'];
const TIMESHEET_LABELS = { normal: 'Normal', overtime: 'Overtime', holiday: 'Holiday', night: 'Night' };

const buildTimesheet = ({ order, entries, classified, from, to, pending, onlyVerified }) => {
  const rows = timesheetRows(entries, classified);
  const cell = (value) => (value ? String(value) : '');
  const workerLabel = (row) => `${row.user_name.toUpperCase()}${row.is_foreman ? ' (Foreman)' : ''}`;
  const totals = Object.fromEntries(PLACES.map((place) => [place, Object.fromEntries(TIMESHEET_CATEGORIES.map((c) => [
    c, rows.reduce((sum, row) => sum + row.hours[place][c], 0)]))]));
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const title = `JOB N.: ${order.ot_number}`;
  const warning = pending
    ? `<div class="warning">${onlyVerified ? `${pending} record(s) pending TMB verification are not included.` : `Includes ${pending} record(s) pending TMB verification.`}</div>` : '';

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${esc(`WO ${order.ot_number} - ${timesheetDate(from)}`)}</title><style>${TIMESHEET_CSS}</style></head>
<body>
  <div class="toolbar"><button onclick="window.print()">🖨 Print / PDF</button></div>
  <img class="logo" src="${location.origin}/logo.jpg" alt="TMB">
  <div class="heading"><h1>From: ${timesheetDate(from)} To: ${timesheetDate(to)}</h1><h1>${esc(title)}</h1></div>
  ${warning}
  <div class="job-title">JOB N.:${esc(order.ot_number)}-${esc(order.description)}</div>
  <table>
    <thead>
      <tr class="groups"><th colspan="2"></th><th class="group" colspan="4">On board</th><th class="group" colspan="4">Workshop</th><th></th></tr>
      <tr class="cols"><th class="worker">Worker</th><th class="date">Date</th>
        ${PLACES.map(() => TIMESHEET_CATEGORIES.map((c) => `<th>${TIMESHEET_LABELS[c]}</th>`).join('')).join('')}
        <th class="total">Total</th></tr>
    </thead>
    <tbody>
      <tr class="spacer"><td colspan="11"></td></tr>
      ${rows.map((row, index) => `<tr class="${index % 2 ? '' : 'shaded'}"><td class="worker">${esc(workerLabel(row))}</td><td class="date">${timesheetDate(row.dayKey)}</td>
        ${PLACES.map((place) => TIMESHEET_CATEGORIES.map((c) => `<td>${cell(row.hours[place][c])}</td>`).join('')).join('')}
        <td class="total">${cell(row.total)}</td></tr>`).join('')}
    </tbody>
    <tfoot><tr><td class="label" colspan="2">TOTAL</td>
      ${PLACES.map((place) => TIMESHEET_CATEGORIES.map((c) => `<td>${cell(totals[place][c])}</td>`).join('')).join('')}
      <td>${grandTotal}</td></tr></tfoot>
  </table>
</body></html>`;

  const csv = toCsv([
    ['JOB N.', 'Description', 'Worker', 'Date',
      ...PLACES.flatMap((place) => TIMESHEET_CATEGORIES.map((c) => `${place === 'board' ? 'On board' : 'Workshop'} ${TIMESHEET_LABELS[c]}`)), 'Total'],
    ...rows.map((row) => [order.ot_number, order.description, workerLabel(row), timesheetDate(row.dayKey),
      ...PLACES.flatMap((place) => TIMESHEET_CATEGORIES.map((c) => row.hours[place][c])), row.total]),
    ['', '', 'TOTAL', '', ...PLACES.flatMap((place) => TIMESHEET_CATEGORIES.map((c) => totals[place][c])), grandTotal],
  ]);

  return { html, csv, csvName: `WO_${order.ot_number}_${from}_${to}.csv` };
};

// ── Hojas mensuales para las oficinas de las subcontratas (formatos oficiales SSPT y UNICREW) ──
const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const pad2 = (n) => String(n).padStart(2, '0');
const clockTime = (iso) => { const d = new Date(iso); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const distinctJoined = (values, separator = ' / ') => [...new Set(values.filter(Boolean))].join(separator);
const orderText = (order) => `${order.ot_number} - ${order.ot_description}`;

const SHEET_BASE_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; background: #f4f6f8; font-family: Calibri, Carlito, Arial, sans-serif; color: #000; }
  .toolbar { margin-bottom: 16px; font-family: Arial, sans-serif; font-size: 13px; }
  .toolbar button { font-size: 14px; padding: 8px 16px; cursor: pointer; margin-right: 12px; }
  .toolbar .warning { display: inline-block; background: #fdf3e7; border-left: 4px solid #e67e22; padding: 8px 10px; }
  .page { width: 210mm; min-height: 297mm; padding: 12mm 14mm; margin: 0 auto 16px; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,.15); }
  table { width: 100%; border-collapse: collapse; }
  @media print {
    body { background: #fff; padding: 0; }
    .toolbar { display: none; }
    .page { margin: 0; box-shadow: none; page-break-after: always; min-height: auto; }
    @page { size: A4 portrait; margin: 0; }
  }
`;

const SSPT_CSS = `
  .logo { height: 34mm; display: block; margin-left: 4mm; }
  h1 { font-size: 22px; margin: 2mm 0 1mm 3mm; }
  .sheet { border: 1.5px solid #000; font-size: 13px; }
  .sheet td { border: 1px solid #000; padding: 1px 4px; }
  .shaded { background: #d9d9d9; }
  .info td { border: none; padding: 1px 4px; }
  .info .label { width: 26%; } .info .colon { width: 3%; } .info .value { font-weight: 700; font-size: 12px; }
  .notice { text-align: center; font-style: italic; font-weight: 700; font-size: 10px; }
  .days td { height: 5.4mm; text-align: center; }
  .days td.desc { text-align: left; }
  .days .head td { font-weight: 700; }
  .month { font-size: 15px; }
  .off { color: #555; }
  .closing { font-style: italic; font-weight: 700; font-size: 10.5px; text-align: center; margin: 1.5mm 0 3mm; }
  .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; font-style: italic; font-weight: 700; font-size: 13px; }
  .signs small { display: block; font-size: 9px; margin-top: 2mm; }
  .signs .rank { font-weight: 400; margin-left: 6px; }
`;

const UNICREW_CSS = `
  body { font-family: Arial, Helvetica, sans-serif; }
  .title { background: #e8e4e6; border: 1px solid #ccc; text-align: center; font-weight: 700; font-size: 17px; padding: 2mm; margin-top: 14mm; }
  .fields { margin: 5mm 0 4mm; font-size: 11px; font-weight: 700; width: 92mm; }
  .fields div { display: flex; align-items: flex-end; gap: 4px; margin-bottom: 3mm; }
  .fields span.line { flex: 1; border-bottom: 1px solid #000; font-weight: 400; font-size: 13px; padding-left: 4px; min-height: 16px; }
  .grid { font-size: 12px; }
  .grid th { background: #e8e4e6; border: 1px solid #000; font-size: 11.5px; padding: 2px 4px; }
  .grid td { border: 1px solid #000; height: 6.3mm; text-align: center; padding: 0 4px; }
  .grid td.desc { text-align: left; font-size: 11px; }
  .grid .c-date { width: 15%; } .grid .c-time { width: 10.5%; } .grid .c-total { width: 16%; }
  .total { margin: 3mm 0 0 37%; font-weight: 700; font-size: 11px; }
  .total span { display: block; font-size: 22px; font-weight: 400; margin: 1mm 0 0 8mm; }
`;

const ssptSheet = ({ worker, days, monthKey, entries }) => {
  const [year, month] = monthKey.split('-').map(Number);
  const offCells = '<td class="off">—</td><td class="off">—</td><td class="desc off">— — — — —</td>';
  return `<section class="page">
    <img class="logo" src="${location.origin}/logo.jpg" alt="TMB">
    <h1>TIME SHEET</h1>
    <table class="sheet">
      <tr><td class="shaded" colspan="4">Services received by</td></tr>
      <tr><td colspan="4" style="padding:0"><table class="info">
        <tr><td class="label">Vessel</td><td class="colon">:</td><td class="value">${esc(distinctJoined(entries.map((e) => e.vessel)))}</td>
            <td class="label">Flag</td><td class="colon">:</td><td class="value">${esc(distinctJoined(entries.map((e) => e.flag)))}</td></tr>
        <tr><td class="label">IMO №</td><td class="colon">:</td><td class="value">${esc(distinctJoined(entries.map((e) => e.imo)))}</td>
            <td class="label">Delivery Address</td><td class="colon">:</td><td class="value">LAS PALMAS, SP</td></tr>
      </table></td></tr>
      <tr><td colspan="4" style="padding:0"><table class="info"><tr><td class="label" style="width:20%">Service description</td><td class="colon">:</td>
        <td class="value">${esc(distinctJoined(entries.map((e) => e.ot_description.toUpperCase()), ' / '))}</td></tr></table></td></tr>
      <tr><td class="notice" colspan="4">BY SIGNING SUBJECT TIME SHEET CONFIRM RECEIPT OF THE FOLLOWING SERVICES:</td></tr>
      <tbody class="days">
        <tr class="head"><td colspan="2" class="month">${MONTHS_EN[month - 1]} ${year}</td><td rowspan="2" style="width:14%">Travel,<br>Days</td>
          <td rowspan="2" class="shaded">Description</td></tr>
        <tr class="head"><td style="width:9%">Date</td><td style="width:17%">Hours</td></tr>
        ${days.map((d) => `<tr><td>${d.day}</td>${d.worked
          ? `<td>${d.hours}</td><td></td><td class="desc">${esc(d.orders.map(orderText).join('; '))}</td>`
          : offCells}</tr>`).join('')}
      </tbody>
    </table>
    <div class="closing">All above mentioned services received in good condition. After signing the document the client becomes fully responsible for services he received.</div>
    <div class="signs">
      <div>${esc(worker.full_name.toUpperCase())}<span class="rank">${esc(worker.rank)}</span><small>Signature/stamp</small></div>
      <div>Signed by Master of:<small>Signature/stamp</small></div>
    </div>
  </section>`;
};

const unicrewSheet = ({ worker, days, entries }) => {
  const total = days.reduce((sum, d) => sum + (d.worked ? d.hours : 0), 0);
  return `<section class="page">
    <div class="title">ATTENDANCE TIMESHEET</div>
    <div class="fields">
      <div>VESSEL NAME:<span class="line">${esc(distinctJoined(entries.map((e) => e.vessel)))}</span></div>
      <div>NAME:<span class="line">${esc(worker.full_name.toUpperCase())}</span></div>
      <div>RANK:<span class="line">${esc(worker.rank.toUpperCase())}</span></div>
    </div>
    <table class="grid">
      <thead><tr><th class="c-date">DATE</th><th class="c-time">WORK<br>STARTED</th><th class="c-time">WORK<br>STOPPED</th>
        <th class="c-total">TOTAL WORKING<br>HOURS</th><th>JOB DESCRIPTION</th></tr></thead>
      <tbody>${days.map((d) => {
        const date = `${pad2(d.day)} ${d.dayKey.slice(5, 7)}`;
        return d.worked
          ? `<tr><td>${date}</td><td>${clockTime(d.start)}</td><td>${clockTime(d.stop)}</td><td>${d.hours}</td>
              <td class="desc">${esc(d.orders.map(orderText).join('; '))}</td></tr>`
          : `<tr><td>${date}</td><td>—</td><td>—</td><td>—</td><td></td></tr>`;
      }).join('')}</tbody>
    </table>
    <div class="total">TOTAL HOURS:<span>${total}</span></div>
  </section>`;
};

const SHEET_TEMPLATES = {
  SSPT: { css: SSPT_CSS, render: ssptSheet },
  UNICREW: { css: UNICREW_CSS, render: unicrewSheet },
};

// workers: [{ worker: { id, full_name, rank, doc_id }, entries }] — solo fichajes verificados por TMB.
const buildSubcontractorSheets = ({ company, monthKey, workers, pending }) => {
  const template = SHEET_TEMPLATES[company.code] || SHEET_TEMPLATES.UNICREW;
  const sheets = workers.map(({ worker, entries }) => ({ worker, entries, days: monthlyWorkerDays(entries, monthKey) }));
  const warning = pending
    ? `<span class="warning">⚠ ${pending} fichaje(s) del mes pendientes de verificar por TMB no se incluyen.</span>` : '';
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${esc(`${company.code} ${monthKey}`)}</title>
<style>${SHEET_BASE_CSS}${template.css}</style></head>
<body>
  <div class="toolbar"><button onclick="window.print()">🖨 Print / PDF</button>${warning}</div>
  ${sheets.map((sheet) => template.render({ ...sheet, monthKey })).join('') || '<section class="page">No verified records.</section>'}
</body></html>`;

  const csv = toCsv([
    ['Company', 'Worker', 'Rank', 'ID', 'Date', 'Work started', 'Work stopped', 'Total hours', 'Job description', 'Vessel'],
    ...sheets.flatMap(({ worker, days }) => days.filter((d) => d.worked).map((d) => [
      company.code, worker.full_name, worker.rank, worker.doc_id, d.dayKey.split('-').reverse().join('/'),
      clockTime(d.start), clockTime(d.stop), d.hours, d.orders.map(orderText).join('; '), distinctJoined(d.orders.map((o) => o.vessel)),
    ])),
  ]);

  return { html, csv, csvName: `${company.code}_${monthKey}.csv` };
};
