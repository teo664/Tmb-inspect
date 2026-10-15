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
  const denied = await call('POST', '/api/my/clock-in', { token: ivan, body: { work_order_id: ot.body.id, place: 'board' } });
  assert.equal(denied.body.error, 'not_assigned');
  assert.equal((await call('GET', '/api/users', { token: ivan })).status, 403);

  const assignment = await call('POST', '/api/assignments', { token: admin, body: { user_id: worker.body.id, work_order_id: ot.body.id } });
  assert.equal(assignment.status, 201);
  assert.equal((await call('GET', '/api/my/work-orders', { token: ivan })).body.length, 1);

  const noPlace = await call('POST', '/api/my/clock-in', { token: ivan, body: { work_order_id: ot.body.id } });
  assert.equal(noPlace.body.error, 'place_required');
  const clockIn = await call('POST', '/api/my/clock-in', { token: ivan, body: { work_order_id: ot.body.id, place: 'workshop' } });
  assert.equal(clockIn.status, 201);
  assert.equal(clockIn.body.place, 'workshop');
  assert.equal((await call('POST', '/api/my/clock-in', { token: ivan, body: { work_order_id: ot.body.id, place: 'board' } })).body.error, 'already_clocked_in');

  // Retirar al operario cierra su fichaje abierto en esa OT
  assert.equal((await call('DELETE', `/api/assignments/${assignment.body.id}`, { token: admin })).status, 200);
  assert.equal((await call('GET', '/api/my/status', { token: ivan })).body.open, null);
  assert.equal((await call('GET', '/api/my/work-orders', { token: ivan })).body.length, 0);

  const manual = await call('POST', '/api/entries', {
    token: admin,
    body: { user_id: worker.body.id, work_order_id: ot.body.id, start_at: '2026-10-01T07:00:00Z', end_at: '2026-10-01T15:30:00Z', place: 'board' },
  });
  assert.equal(manual.status, 201);
  assert.equal(manual.body.minutes, 510);

  const overlap = await call('POST', '/api/entries', {
    token: admin,
    body: { user_id: worker.body.id, work_order_id: ot.body.id, start_at: '2026-10-01T15:00:00Z', end_at: '2026-10-01T16:00:00Z', place: 'board' },
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
  await call('POST', '/api/my/clock-in', { token: andrei, body: { work_order_id: ot.id, place: 'board' } });

  await call('PUT', `/api/work-orders/${ot.id}`, { token: admin, body: { status: 'closed' } });
  assert.equal((await call('GET', '/api/my/status', { token: andrei })).body.open, null);
  const active = (await call('GET', `/api/assignments?work_order_id=${ot.id}&active=1`, { token: admin })).body;
  assert.equal(active.length, 0);
});

test('capataz por OT y festivos', async () => {
  const admin = await login('admin', 'secret');
  const sspt = (await call('GET', '/api/companies', { token: admin })).body.find((c) => c.code === 'SSPT');
  const worker = (await call('POST', '/api/users', {
    token: admin, body: { username: 'osmel', full_name: 'Urdaneta Viera Osmel', password: '9999', company_id: sspt.id },
  })).body;
  const ot = (await call('POST', '/api/work-orders', { token: admin, body: { ot_number: '2362.1', description: 'Margins Plates' } })).body;
  const assignment = (await call('POST', '/api/assignments', { token: admin, body: { user_id: worker.id, work_order_id: ot.id, is_foreman: true } })).body;
  const entry = (await call('POST', '/api/entries', {
    token: admin,
    body: { user_id: worker.id, work_order_id: ot.id, start_at: '2026-10-09T07:00:00Z', end_at: '2026-10-09T12:00:00Z', place: 'board' },
  })).body;
  assert.equal(entry.is_foreman, 1);
  await call('PUT', `/api/assignments/${assignment.id}`, { token: admin, body: { is_foreman: false } });
  assert.equal((await call('GET', `/api/entries?work_order_id=${ot.id}`, { token: admin })).body[0].is_foreman, 0);

  assert.equal((await call('POST', '/api/holidays', { token: admin, body: { date: '2026-10-12', name: 'Fiesta Nacional' } })).status, 201);
  assert.equal((await call('POST', '/api/holidays', { token: admin, body: { date: '12/10/2026' } })).status, 400);
  assert.deepEqual((await call('GET', '/api/holidays', { token: admin })).body, [{ date: '2026-10-12', name: 'Fiesta Nacional' }]);
  await call('DELETE', '/api/holidays/2026-10-12', { token: admin });
  assert.equal((await call('GET', '/api/holidays', { token: admin })).body.length, 0);
});

test('el encargado valida o rechaza fichajes y el operario recibe el aviso', async () => {
  const admin = await login('admin', 'secret');
  const companies = (await call('GET', '/api/companies', { token: admin })).body;
  const tmb = companies.find((c) => c.code === 'TMB');
  const sspt = companies.find((c) => c.code === 'SSPT');
  const boss = await call('POST', '/api/users', {
    token: admin, body: { username: 'jefe', full_name: 'Juan Encargado', password: 'boss1', company_id: tmb.id, role: 'supervisor' },
  });
  assert.equal(boss.status, 201);
  assert.equal(boss.body.role, 'supervisor');
  const worker = (await call('POST', '/api/users', {
    token: admin, body: { username: 'sergei', full_name: 'Sergei Volkov', password: '4321', company_id: sspt.id, lang: 'ru' },
  })).body;
  const ot = (await call('POST', '/api/work-orders', { token: admin, body: { ot_number: 'OT-REJ', description: 'Pintura' } })).body;
  const [first, second] = await Promise.all(['2026-10-13', '2026-10-14'].map(async (day) => (await call('POST', '/api/entries', {
    token: admin,
    body: { user_id: worker.id, work_order_id: ot.id, start_at: `${day}T07:00:00Z`, end_at: `${day}T15:00:00Z`, place: 'board' },
  })).body));

  const jefe = await login('jefe', 'boss1');
  // Puede consultar y validar, pero no cambiar datos ni gestionar usuarios.
  assert.equal((await call('GET', `/api/entries?work_order_id=${ot.id}`, { token: jefe })).body.length, 2);
  assert.equal((await call('GET', '/api/users', { token: jefe })).status, 200);
  assert.equal((await call('POST', '/api/users', { token: jefe, body: { username: 'x', full_name: 'X', password: '1234', company_id: sspt.id } })).status, 403);
  assert.equal((await call('PUT', `/api/entries/${first.id}`, { token: jefe, body: { end_at: '2026-10-13T16:00:00Z' } })).status, 403);
  assert.equal((await call('DELETE', `/api/entries/${first.id}`, { token: jefe })).status, 403);
  assert.equal((await call('GET', '/api/audit', { token: jefe })).status, 403);

  assert.equal((await call('POST', '/api/entries/reject', { token: jefe, body: { ids: [second.id], reason: ' ' } })).body.error, 'reason_required');
  assert.equal((await call('POST', '/api/entries/verify', { token: jefe, body: { ids: [first.id] } })).body.updated, 1);
  assert.equal((await call('POST', '/api/entries/reject', { token: jefe, body: { ids: [second.id], reason: 'Ese día estuvo en el taller' } })).body.updated, 1);

  const rejected = (await call('GET', `/api/entries?status=rejected&work_order_id=${ot.id}`, { token: admin })).body;
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].review_note, 'Ese día estuvo en el taller');
  assert.equal(rejected[0].verified_by_name, 'Juan Encargado');

  const sergei = await login('sergei', '4321');
  const notices = (await call('GET', '/api/my/notices', { token: sergei })).body;
  assert.deepEqual(notices.map((n) => [n.id, n.review_note]), [[second.id, 'Ese día estuvo en el taller']]);
  await call('POST', '/api/my/notices/ack', { token: sergei });
  assert.equal((await call('GET', '/api/my/notices', { token: sergei })).body.length, 0);
  assert.equal((await call('GET', '/api/entries/reject', { token: sergei })).status, 403);

  // El administrador corrige el fichaje rechazado: vuelve a quedar pendiente.
  const fixed = await call('PUT', `/api/entries/${second.id}`, { token: admin, body: { place: 'workshop' } });
  assert.equal(fixed.body.status, 'pending');
});
