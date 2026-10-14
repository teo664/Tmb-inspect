const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase, ensureAdmin } = require('../db');
const { createApp } = require('../server');

let server;
let base;

const call = async (method, url, { token, body } = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

const login = async (username, password) => (await call('POST', '/api/login', { body: { username, password } })).body.token;

before(async () => {
  const db = openDatabase(':memory:');
  ensureAdmin(db, 'admin', 'secret');
  server = createApp(db).listen(0);
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

test('flujo completo: alta, asignación, fichaje, retirada y verificación', async () => {
  const admin = await login('admin', 'secret');
  assert.ok(admin);

  const companies = (await call('GET', '/api/companies', { token: admin })).body;
  const sspt = companies.find((c) => c.code === 'SSPT');

  const worker = await call('POST', '/api/users', {
    token: admin,
    body: { username: 'Ivan', full_name: 'Ivan Petrov', password: '1234', company_id: sspt.id, lang: 'ru' },
  });
  assert.equal(worker.status, 201);
  assert.equal(worker.body.username, 'ivan');

  const ot = await call('POST', '/api/work-orders', { token: admin, body: { ot_number: 'OT-001', description: 'Chorreado casco', client: 'Naviera X' } });
  assert.equal(ot.status, 201);
  const dupOt = await call('POST', '/api/work-orders', { token: admin, body: { ot_number: 'ot-001', description: 'x' } });
  assert.equal(dupOt.status, 409);

  const ivan = await login('ivan', '1234');
  const denied = await call('POST', '/api/my/clock-in', { token: ivan, body: { work_order_id: ot.body.id } });
  assert.equal(denied.body.error, 'not_assigned');
  assert.equal((await call('GET', '/api/users', { token: ivan })).status, 403);

  const assignment = await call('POST', '/api/assignments', { token: admin, body: { user_id: worker.body.id, work_order_id: ot.body.id } });
  assert.equal(assignment.status, 201);
  assert.equal((await call('GET', '/api/my/work-orders', { token: ivan })).body.length, 1);

  const clockIn = await call('POST', '/api/my/clock-in', { token: ivan, body: { work_order_id: ot.body.id } });
  assert.equal(clockIn.status, 201);
  assert.equal((await call('POST', '/api/my/clock-in', { token: ivan, body: { work_order_id: ot.body.id } })).body.error, 'already_clocked_in');

  // Retirar al operario cierra su fichaje abierto en esa OT
  assert.equal((await call('DELETE', `/api/assignments/${assignment.body.id}`, { token: admin })).status, 200);
  assert.equal((await call('GET', '/api/my/status', { token: ivan })).body.open, null);
  assert.equal((await call('GET', '/api/my/work-orders', { token: ivan })).body.length, 0);

  const manual = await call('POST', '/api/entries', {
    token: admin,
    body: { user_id: worker.body.id, work_order_id: ot.body.id, start_at: '2026-10-01T07:00:00Z', end_at: '2026-10-01T15:30:00Z' },
  });
  assert.equal(manual.status, 201);
  assert.equal(manual.body.minutes, 510);

  const overlap = await call('POST', '/api/entries', {
    token: admin,
    body: { user_id: worker.body.id, work_order_id: ot.body.id, start_at: '2026-10-01T15:00:00Z', end_at: '2026-10-01T16:00:00Z' },
  });
  assert.equal(overlap.body.error, 'entry_overlap');

  await call('POST', '/api/entries/verify', { token: admin, body: { ids: [manual.body.id] } });
  const verified = await call('GET', `/api/entries?status=verified&company_id=${sspt.id}`, { token: admin });
  assert.equal(verified.body.length, 1);
  assert.equal(verified.body[0].verified_by_name, 'Administrador TMB');

  // Editar tiempos anula la verificación
  const edited = await call('PUT', `/api/entries/${manual.body.id}`, { token: admin, body: { end_at: '2026-10-01T16:00:00Z' } });
  assert.equal(edited.body.status, 'pending');
  assert.equal(edited.body.minutes, 540);

  // Desactivar usuario invalida su sesión
  await call('PUT', `/api/users/${worker.body.id}`, { token: admin, body: { active: false } });
  assert.equal((await call('GET', '/api/me', { token: ivan })).status, 401);
  assert.equal((await call('POST', '/api/login', { body: { username: 'ivan', password: '1234' } })).status, 401);

  const auditLog = (await call('GET', '/api/audit', { token: admin })).body;
  assert.ok(auditLog.some((row) => row.action === 'entry.update'));
});

test('cerrar una OT retira a los operarios asignados', async () => {
  const admin = await login('admin', 'secret');
  const unicrew = (await call('GET', '/api/companies', { token: admin })).body.find((c) => c.code === 'UNICREW');
  const worker = (await call('POST', '/api/users', {
    token: admin, body: { username: 'andrei', full_name: 'Andrei Popescu', password: '5678', company_id: unicrew.id, lang: 'ro' },
  })).body;
  const ot = (await call('POST', '/api/work-orders', { token: admin, body: { ot_number: 'OT-002', description: 'Soldadura' } })).body;
  await call('POST', '/api/assignments', { token: admin, body: { user_id: worker.id, work_order_id: ot.id } });
  const andrei = await login('andrei', '5678');
  await call('POST', '/api/my/clock-in', { token: andrei, body: { work_order_id: ot.id } });

  await call('PUT', `/api/work-orders/${ot.id}`, { token: admin, body: { status: 'closed' } });
  assert.equal((await call('GET', '/api/my/status', { token: andrei })).body.open, null);
  const active = (await call('GET', `/api/assignments?work_order_id=${ot.id}&active=1`, { token: admin })).body;
  assert.equal(active.length, 0);
});
