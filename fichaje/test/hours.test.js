process.env.TZ = 'Atlantic/Canary';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyEntries, timesheetRows } = require('../public/hours');

// Horas locales de Canarias (octubre: UTC+1)
const at = (day, hour, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
const entry = (id, day, from, to, extra = {}) => ({
  id, user_id: 1, user_name: 'ANATOLII BILYI', start_at: at(day, ...from), end_at: at(...(Array.isArray(to[0]) ? to[0] : [day]), ...(Array.isArray(to[0]) ? to.slice(1) : to)), place: 'board', ...extra,
});

test('jornada laborable de 10 h: 8 normales y 2 extra', () => {
  const entries = [entry(1, 9, [7, 0], [17, 0])]; // viernes 09-10-2026
  const [row] = timesheetRows(entries, classifyEntries(entries));
  assert.deepEqual(row.hours.board, { normal: 8, overtime: 2, holiday: 0, night: 0 });
  assert.equal(row.total, 10);
});

test('el límite de 8 h suma a bordo y taller y las extra van al tramo posterior', () => {
  const entries = [
    entry(1, 9, [7, 0], [13, 0]),
    entry(2, 9, [14, 0], [18, 0], { place: 'workshop' }),
  ];
  const [row] = timesheetRows(entries, classifyEntries(entries));
  assert.deepEqual(row.hours.board, { normal: 6, overtime: 0, holiday: 0, night: 0 });
  assert.deepEqual(row.hours.workshop, { normal: 2, overtime: 2, holiday: 0, night: 0 });
  assert.equal(row.total, 10);
});

test('sábado y festivos cuentan como holiday', () => {
  const entries = [entry(1, 10, [8, 0], [14, 0]), entry(2, 12, [8, 0], [12, 0])]; // sábado 10 y lunes 12 festivo
  const rows = timesheetRows(entries, classifyEntries(entries, new Set(['2026-10-12'])));
  assert.deepEqual(rows.map((r) => r.hours.board.holiday), [6, 4]);
});

test('horas entre 22:00 y 06:00 en laborable son night', () => {
  const entries = [{ ...entry(1, 8, [20, 0], [0, 0]), end_at: new Date(2026, 9, 9, 2, 0).toISOString() }];
  const [row] = timesheetRows(entries, classifyEntries(entries));
  assert.deepEqual(row.hours.board, { normal: 2, overtime: 0, holiday: 0, night: 4 });
});

test('redondeo de cada casilla a la hora entera', () => {
  const entries = [entry(1, 9, [7, 0], [16, 20])]; // 9 h 20 min → 8 normales + 1 h 20 extra
  const [row] = timesheetRows(entries, classifyEntries(entries));
  assert.deepEqual(row.hours.board, { normal: 8, overtime: 1, holiday: 0, night: 0 });
  assert.equal(row.total, 9);
});

test('el capataz se marca en la fila', () => {
  const entries = [entry(1, 9, [7, 0], [12, 0], { is_foreman: 1 })];
  const [row] = timesheetRows(entries, classifyEntries(entries));
  assert.equal(row.is_foreman, true);
  assert.equal(row.total, 5);
});

const { monthlyWorkerDays } = require('../public/hours');

test('hoja mensual: un día por fila, primera entrada, última salida y total redondeado', () => {
  const entries = [
    { id: 1, work_order_id: 7, start_at: at(1, 8), end_at: at(1, 13), ot_number: '2362.1' },
    { id: 2, work_order_id: 8, start_at: at(1, 14), end_at: at(1, 18, 20), ot_number: '2370.2' },
    { id: 3, work_order_id: 7, start_at: at(2, 8), end_at: at(2, 18) },
    { id: 4, work_order_id: 7, start_at: at(31, 8), end_at: null },
  ];
  const days = monthlyWorkerDays(entries, '2026-10');
  assert.equal(days.length, 31);
  assert.equal(days[0].hours, 9); // 5 h + 4 h 20 min
  assert.equal(new Date(days[0].start).getHours(), 8);
  assert.equal(new Date(days[0].stop).getHours(), 18);
  assert.deepEqual(days[0].orders.map((o) => o.work_order_id), [7, 8]);
  assert.equal(days[1].hours, 10);
  assert.equal(days[2].worked, false);
  assert.equal(days[30].worked, false); // el fichaje abierto no cuenta
  assert.equal(monthlyWorkerDays([], '2026-09').length, 30);
});
