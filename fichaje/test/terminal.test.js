const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase, ensureAdmin } = require('../db');
const { createApp } = require('../server');

let server;
let base;

const call = async (method, url, { token, terminal, body } = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` }),
      ...(terminal && { 'x-terminal-token': terminal }),
    },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

before(() => {
  const db = openDatabase(':memory:');
  ensureAdmin(db, 'admin', 'secret');
  server = createApp(db).listen(0);
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

test('ordenador de fichaje: lista de operarios, PIN, sesión corta y revocación', async () => {
  const admin = (await call('POST', '/api/login', { body: { username: 'admin', password: 'secret' } })).body.token;
  const sspt = (await call('GET', '/api/companies', { token: admin })).body.find((c) => c.code === 'SSPT');
  const ot = (await call('POST', '/api/work-orders', { token: admin, body: { ot_number: 'K-1', description: 'Kiosk' } })).body;

  const badPin = await call('POST', '/api/users', {
    token: admin, body: { username: 'x', full_name: 'X', password: '1234', company_id: sspt.id, pin: '12a4' },
  });
  assert.equal(badPin.body.error, 'invalid_pin_format');

  const withPin = (await call('POST', '/api/users', {
    token: admin, body: { username: 'ana', full_name: 'Ana Pin', password: '1234', company_id: sspt.id, pin: '4321' },
  })).body;
  assert.equal(withPin.has_pin, true);
  const noPin = (await call('POST', '/api/users', {
    token: admin, body: { username: 'bob', full_name: 'Bob NoPin', password: '1234', company_id: sspt.id },
  })).body;
  const unassigned = (await call('POST', '/api/users', {
    token: admin, body: { username: 'cid', full_name: 'Cid Libre', password: '1234', company_id: sspt.id, pin: '1111' },
  })).body;
  for (const user of [withPin, noPin]) await call('POST', '/api/assignments', { token: admin, body: { user_id: user.id, work_order_id: ot.id } });

  // Sin token de terminal no hay acceso; solo un administrador puede crear terminales.
  assert.equal((await call('GET', '/api/terminal/workers')).status, 401);
  const worker = (await call('POST', '/api/login', { body: { username: 'ana', password: '1234' } })).body.token;
  assert.equal((await call('POST', '/api/terminals', { token: worker, body: { name: 'Hack' } })).status, 403);
  const terminal = (await call('POST', '/api/terminals', { token: admin, body: { name: 'Taller entrada' } })).body;
  assert.ok(terminal.token);

  const workers = (await call('GET', '/api/terminal/workers', { terminal: terminal.token })).body;
  assert.deepEqual(workers.map((w) => w.full_name), ['Ana Pin']); // sin PIN o sin OT abierta no aparecen
  assert.ok(!('username' in workers[0]));
  assert.ok(!workers.some((w) => w.id === unassigned.id));

  assert.equal((await call('POST', '/api/terminal/login', { terminal: terminal.token, body: { user_id: withPin.id, pin: '0000' } })).body.error, 'invalid_pin');
  const login = await call('POST', '/api/terminal/login', { terminal: terminal.token, body: { user_id: withPin.id, pin: '4321' } });
  assert.equal(login.status, 200);
  const clockIn = await call('POST', '/api/my/clock-in', { token: login.body.token, body: { work_order_id: ot.id, place: 'workshop' } });
  assert.equal(clockIn.status, 201);
  assert.equal((await call('GET', '/api/terminal/workers', { terminal: terminal.token })).body[0].clocked_in, true);

  // 5 PIN erróneos bloquean al operario aunque luego acierte.
  for (let i = 0; i < 5; i += 1) await call('POST', '/api/terminal/login', { terminal: terminal.token, body: { user_id: withPin.id, pin: '9999' } });
  assert.equal((await call('POST', '/api/terminal/login', { terminal: terminal.token, body: { user_id: withPin.id, pin: '4321' } })).body.error, 'pin_locked');

  assert.equal((await call('GET', '/api/terminals', { token: admin })).body.length, 1);
  await call('DELETE', `/api/terminals/${terminal.id}`, { token: admin });
  assert.equal((await call('GET', '/api/terminal/workers', { terminal: terminal.token })).status, 401);
});
