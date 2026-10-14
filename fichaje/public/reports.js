// TMB Fichaje — documentos imprimibles (time sheet cliente y resumen subcontrata).
// El time sheet de cliente sigue el formato oficial de TMB; el resumen de subcontrata es provisional.

const reportFormat = (lang) => {
  const loc = LOCALES[lang];
  const pad2 = (n) => String(n).padStart(2, '0');
  return {
    t: (key, vars) => tr(key, vars, lang),
    date: (iso) => new Date(iso).toLocaleDateString(loc, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    weekday: (iso) => new Date(iso).toLocaleDateString(loc, { weekday: 'short' }),
    time: (iso) => { const d = new Date(iso); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; },
    hours: (minutes) => (minutes / 60).toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    now: () => new Date().toLocaleString(loc),
  };
};

const groupBy = (items, keyOf) => items.reduce((groups, item) => {
  const key = keyOf(item);
  (groups.get(key) || groups.set(key, []).get(key)).push(item);
  return groups;
}, new Map());

const totalMinutes = (entries) => entries.reduce((sum, e) => sum + e.minutes, 0);

const periodText = (fmt, from, to) => `${fmt.date(`${from}T00:00`)} – ${fmt.date(`${to}T00:00`)}`;

const csvCell = (value) => {
  const text = String(value ?? '');
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (rows) => rows.map((row) => row.map(csvCell).join(';')).join('\r\n');

const downloadCsv = (name, csv) => {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};

const REPORT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1F2D3D; margin: 0; padding: 24px; font-size: 11px; }
  .toolbar { margin-bottom: 16px; }
  .toolbar button { font-size: 14px; padding: 8px 16px; cursor: pointer; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #C8102E; padding-bottom: 10px; margin-bottom: 14px; }
  header img { height: 56px; }
  header .title { text-align: right; }
  header h1 { margin: 0; font-size: 20px; letter-spacing: 0.04em; }
  .info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 24px; margin-bottom: 14px; }
  .info div span { color: #6b7a89; display: inline-block; min-width: 110px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { background: #1F2D3D; color: #fff; text-align: left; padding: 5px 6px; font-weight: 600; }
  td { border-bottom: 1px solid #d5dce4; padding: 4px 6px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.subtotal td { font-weight: 700; background: #F4F6F8; }
  tr.grand td { font-weight: 700; background: #1F2D3D; color: #fff; }
  h2 { font-size: 13px; margin: 18px 0 6px; }
  .warning { background: #fdf3e7; border-left: 4px solid #e67e22; padding: 8px 10px; margin-bottom: 14px; }
  .verified { background: #e8f7f0; border-left: 4px solid #1a9e5c; padding: 8px 10px; margin-bottom: 14px; font-weight: 600; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 36px; page-break-inside: avoid; }
  .signatures div { border-top: 1px solid #1F2D3D; padding-top: 6px; min-height: 80px; }
  .signatures small { color: #6b7a89; display: block; }
  footer { margin-top: 24px; color: #6b7a89; font-size: 9px; border-top: 1px solid #d5dce4; padding-top: 6px; }
  .worker-block { page-break-inside: avoid; }
  @media print { .toolbar { display: none; } body { padding: 0; } @page { margin: 12mm; } }
`;

const reportShell = (fmt, title, body) => `<!DOCTYPE html>
<html lang="${fmt.lang}"><head><meta charset="UTF-8"><title>${esc(title)}</title><style>${REPORT_CSS}</style></head>
<body>
  <div class="toolbar"><button onclick="window.print()">🖨 ${fmt.t('print_pdf')}</button></div>
  <header>
    <img src="${location.origin}/logo.jpg" alt="TMB">
    <div class="title"><h1>${esc(title)}</h1><div>Technical Maritime Bureau SL</div></div>
  </header>
  ${body}
  <footer>${fmt.t('generated_on')} ${fmt.now()} · Technical Maritime Bureau SL · Las Palmas de Gran Canaria · info@technicalmb.net · +34 928 271 172</footer>
</body></html>`;

const writeReportWindow = (win, html) => {
  win.document.open();
  win.document.write(html);
  win.document.close();
};

const signatures = (fmt, leftKey, rightKey) => `
  <div class="signatures">
    <div><strong>${fmt.t(leftKey)}</strong><small>${fmt.t('name_signature_date')}</small></div>
    <div><strong>${fmt.t(rightKey)}</strong><small>${fmt.t('name_signature_date')}</small></div>
  </div>`;

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

// ── Resumen para la oficina de la subcontrata: horas verificadas por operario ──
const buildSummary = ({ company, entries, from, to, lang, pending }) => {
  const fmt = { ...reportFormat(lang), lang };
  const sorted = [...entries].sort((a, b) => a.user_name.localeCompare(b.user_name) || a.start_at.localeCompare(b.start_at));
  const byWorker = groupBy(sorted, (e) => e.user_id);
  const title = `${fmt.t('summary').toUpperCase()} · ${company.code}`;

  const workerBlocks = [...byWorker.values()].map((list) => `
    <div class="worker-block">
      <h2>${esc(list[0].user_name)}${list[0].user_doc_id ? ` · ${esc(list[0].user_doc_id)}` : ''}</h2>
      <table>
        <thead><tr><th>${fmt.t('date')}</th><th>${fmt.t('ot')}</th><th>${fmt.t('description')}</th>
          <th>${fmt.t('start')}</th><th>${fmt.t('end')}</th><th class="num">${fmt.t('hours')}</th></tr></thead>
        <tbody>
          ${list.map((e) => `<tr><td>${fmt.weekday(e.start_at)} ${fmt.date(e.start_at)}</td><td>${esc(e.ot_number)}</td><td>${esc(e.ot_description)}</td>
            <td>${fmt.time(e.start_at)}</td><td>${fmt.time(e.end_at)}</td><td class="num">${fmt.hours(e.minutes)}</td></tr>`).join('')}
          <tr class="subtotal"><td colspan="5">${fmt.t('total')} · ${fmt.t('days_worked')}: ${new Set(list.map((e) => localDateKey(e.start_at))).size}</td>
            <td class="num">${fmt.hours(totalMinutes(list))}</td></tr>
        </tbody>
      </table>
    </div>`).join('');

  const body = `
    <div class="info">
      <div><span>${fmt.t('company')}:</span> <strong>${esc(company.name)}</strong></div>
      <div><span>${fmt.t('period')}:</span> ${periodText(fmt, from, to)}</div>
    </div>
    <div class="verified">✓ ${fmt.t('verified_by_tmb')}</div>
    ${pending ? `<div class="warning">${fmt.t('pending_warning', { n: pending })}</div>` : ''}
    <h2>${fmt.t('total_hours')}</h2>
    <table>
      <thead><tr><th>${fmt.t('worker')}</th><th>${fmt.t('doc_id')}</th><th class="num">${fmt.t('days_worked')}</th><th class="num">${fmt.t('hours')}</th></tr></thead>
      <tbody>
        ${[...byWorker.values()].map((list) => `<tr><td>${esc(list[0].user_name)}</td><td>${esc(list[0].user_doc_id)}</td>
          <td class="num">${new Set(list.map((e) => localDateKey(e.start_at))).size}</td><td class="num">${fmt.hours(totalMinutes(list))}</td></tr>`).join('')
          || `<tr><td colspan="4">${fmt.t('no_entries')}</td></tr>`}
        <tr class="grand"><td colspan="3">${fmt.t('total')}</td><td class="num">${fmt.hours(totalMinutes(sorted))}</td></tr>
      </tbody>
    </table>
    ${workerBlocks}
    ${signatures(fmt, 'signature_tmb', 'signature_company')}`;

  const csv = toCsv([
    [fmt.t('company'), fmt.t('worker'), fmt.t('doc_id'), fmt.t('date'), fmt.t('ot_number'), fmt.t('description'),
      fmt.t('start'), fmt.t('end'), fmt.t('hours')],
    ...sorted.map((e) => [company.code, e.user_name, e.user_doc_id, fmt.date(e.start_at), e.ot_number, e.ot_description,
      fmt.time(e.start_at), fmt.time(e.end_at), fmt.hours(e.minutes)]),
  ]);

  return { html: reportShell(fmt, title, body), csv, csvName: `resumen_${company.code}_${from}_${to}.csv` };
};
