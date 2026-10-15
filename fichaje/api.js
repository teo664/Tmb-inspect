// TMB Fichaje — API REST
const crypto = require('crypto');
const express = require('express');
const { hashPassword, verifyPassword, transaction } = require('./db');

const LANGS = ['es', 'en', 'ru', 'ro'];
const PLACES = ['board', 'workshop'];
const SESSION_DAYS = 30;
const MAX_LOGIN_FAILURES = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

const now = () => new Date().toISOString();

const requireText = (value, code) => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new ApiError(400, code);
  return text;
};

const optionalText = (value) => (typeof value === 'string' ? value.trim() : '');

const parseTimestamp = (value, code) => {
  const date = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(date.getTime())) throw new ApiError(400, code);
  return date.toISOString();
};

const parseId = (value, code) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, code);
  return id;
};

const parsePlace = (value) => {
  if (!PLACES.includes(value)) throw new ApiError(400, 'place_required');
  return value;
};

const minutesBetween = (start, end) => (end ? Math.round((Date.parse(end) - Date.parse(start)) / 60000) : null);

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  full_name: user.full_name,
  doc_id: user.doc_id,
  rank: user.rank,
  role: user.role,
  company_id: user.company_id,
  company_code: user.company_code,
  lang: user.lang,
  active: Boolean(user.active),
});

const ENTRY_SELECT = `
  SELECT e.*, u.full_name AS user_name, u.doc_id AS user_doc_id, u.rank AS user_rank, u.company_id, c.code AS company_code,
         w.ot_number, w.description AS ot_description, w.client, w.vessel, w.location, w.imo, w.flag,
         v.full_name AS verified_by_name,
         (SELECT a.is_foreman FROM assignments a WHERE a.user_id = e.user_id AND a.work_order_id = e.work_order_id
           ORDER BY a.id DESC LIMIT 1) AS is_foreman
  FROM time_entries e
  JOIN users u ON u.id = e.user_id
  JOIN companies c ON c.id = u.company_id
  JOIN work_orders w ON w.id = e.work_order_id
  LEFT JOIN users v ON v.id = e.verified_by`;

const withMinutes = (entry) => ({ ...entry, minutes: minutesBetween(entry.start_at, entry.end_at) });

const createApi = (db) => {
  const router = express.Router();
  const loginFailures = new Map();

  const audit = (userId, action, detail = {}) => {
    db.prepare('INSERT INTO audit_log (user_id, action, detail, at) VALUES (?, ?, ?, ?)')
      .run(userId, action, JSON.stringify(detail), now());
  };

  const getUser = (id) => db.prepare(`
    SELECT u.*, c.code AS company_code FROM users u JOIN companies c ON c.id = u.company_id WHERE u.id = ?`).get(id);

  const getEntry = (id) => {
    const entry = db.prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(id);
    if (!entry) throw new ApiError(404, 'entry_not_found');
    return withMinutes(entry);
  };

  const getWorkOrder = (id) => {
    const order = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id);
    if (!order) throw new ApiError(404, 'work_order_not_found');
    return order;
  };

  const assertNoOverlap = (userId, start, end, ignoreId = 0) => {
    const clash = db.prepare(`
      SELECT id FROM time_entries
      WHERE user_id = ? AND id != ? AND start_at < ? AND (end_at IS NULL OR end_at > ?)`)
      .get(userId, ignoreId, end || '9999', start);
    if (clash) throw new ApiError(409, 'entry_overlap');
  };

  // Cierra el fichaje abierto de un operario (si lo hay) en una OT concreta o en cualquiera.
  const closeOpenEntry = (userId, actorId, workOrderId = null, reason = '') => {
    const open = db.prepare('SELECT * FROM time_entries WHERE user_id = ? AND end_at IS NULL').get(userId);
    if (!open || (workOrderId && open.work_order_id !== workOrderId)) return null;
    const at = now();
    db.prepare('UPDATE time_entries SET end_at = ?, updated_at = ?, updated_by = ? WHERE id = ?')
      .run(at, at, actorId, open.id);
    audit(actorId, 'entry.auto_close', { entry_id: open.id, reason });
    return open.id;
  };

  const removeAssignment = (assignment, actorId, reason) => {
    db.prepare('UPDATE assignments SET removed_at = ?, removed_by = ? WHERE id = ?').run(now(), actorId, assignment.id);
    closeOpenEntry(assignment.user_id, actorId, assignment.work_order_id, reason);
    audit(actorId, 'assignment.remove', { assignment_id: assignment.id, reason });
  };

  // ── Autenticación ───────────────────────────────────────────
  const authenticate = (req, res, next) => {
    const token = (req.get('authorization') || '').replace(/^Bearer /, '');
    const session = token && db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?').get(token, now());
    const user = session && getUser(session.user_id);
    if (!user || !user.active) return next(new ApiError(401, 'unauthorized'));
    req.user = user;
    req.token = token;
    next();
  };

  const adminOnly = (req, res, next) => next(req.user.role === 'admin' ? undefined : new ApiError(403, 'forbidden'));

  router.post('/login', (req, res) => {
    const username = requireText(req.body.username, 'credentials_required').toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const key = `${req.ip}|${username}`;
    const failures = (loginFailures.get(key) || []).filter((t) => Date.now() - t < LOGIN_WINDOW_MS);
    if (failures.length >= MAX_LOGIN_FAILURES) throw new ApiError(429, 'too_many_attempts');

    const row = db.prepare('SELECT id, password_hash, active FROM users WHERE username = ?').get(username);
    if (!row || !row.active || !verifyPassword(password, row.password_hash)) {
      loginFailures.set(key, [...failures, Date.now()]);
      throw new ApiError(401, 'invalid_credentials');
    }
    loginFailures.delete(key);
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, row.id, expires);
    res.json({ token, user: publicUser(getUser(row.id)) });
  });

  router.use(authenticate);

  router.post('/logout', (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
    res.json({ ok: true });
  });

  router.get('/me', (req, res) => res.json(publicUser(req.user)));

  router.put('/me/lang', (req, res) => {
    if (!LANGS.includes(req.body.lang)) throw new ApiError(400, 'invalid_lang');
    db.prepare('UPDATE users SET lang = ? WHERE id = ?').run(req.body.lang, req.user.id);
    res.json(publicUser(getUser(req.user.id)));
  });

  router.put('/me/password', (req, res) => {
    if (!verifyPassword(String(req.body.current || ''), req.user.password_hash)) throw new ApiError(400, 'invalid_credentials');
    const next = String(req.body.password || '');
    if (next.length < 4) throw new ApiError(400, 'password_too_short');
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), req.user.id);
    audit(req.user.id, 'user.password_change', { user_id: req.user.id });
    res.json({ ok: true });
  });

  // ── Operario: fichaje ───────────────────────────────────────
  router.get('/my/work-orders', (req, res) => {
    res.json(db.prepare(`
      SELECT w.* FROM assignments a JOIN work_orders w ON w.id = a.work_order_id
      WHERE a.user_id = ? AND a.removed_at IS NULL AND w.status = 'open'
      ORDER BY w.ot_number`).all(req.user.id));
  });

  router.get('/my/status', (req, res) => {
    const open = db.prepare(`${ENTRY_SELECT} WHERE e.user_id = ? AND e.end_at IS NULL`).get(req.user.id);
    res.json({ open: open ? withMinutes(open) : null });
  });

  router.post('/my/clock-in', (req, res) => {
    const workOrderId = parseId(req.body.work_order_id, 'work_order_required');
    const place = parsePlace(req.body.place);
    const entryId = transaction(db, () => {
      const assigned = db.prepare(`
        SELECT 1 FROM assignments a JOIN work_orders w ON w.id = a.work_order_id
        WHERE a.user_id = ? AND a.work_order_id = ? AND a.removed_at IS NULL AND w.status = 'open'`)
        .get(req.user.id, workOrderId);
      if (!assigned) throw new ApiError(403, 'not_assigned');
      if (db.prepare('SELECT 1 FROM time_entries WHERE user_id = ? AND end_at IS NULL').get(req.user.id)) {
        throw new ApiError(409, 'already_clocked_in');
      }
      const at = now();
      const result = db.prepare(`
        INSERT INTO time_entries (user_id, work_order_id, place, start_at, note, created_at, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(req.user.id, workOrderId, place, at, optionalText(req.body.note), at, at, req.user.id);
      audit(req.user.id, 'entry.clock_in', { entry_id: Number(result.lastInsertRowid) });
      return Number(result.lastInsertRowid);
    });
    res.status(201).json(getEntry(entryId));
  });

  router.post('/my/clock-out', (req, res) => {
    const open = db.prepare('SELECT * FROM time_entries WHERE user_id = ? AND end_at IS NULL').get(req.user.id);
    if (!open) throw new ApiError(409, 'not_clocked_in');
    const at = now();
    const note = [open.note, optionalText(req.body.note)].filter(Boolean).join(' · ');
    db.prepare('UPDATE time_entries SET end_at = ?, note = ?, updated_at = ?, updated_by = ? WHERE id = ?')
      .run(at, note, at, req.user.id, open.id);
    audit(req.user.id, 'entry.clock_out', { entry_id: open.id });
    res.json(getEntry(open.id));
  });

  router.get('/my/entries', (req, res) => {
    const from = req.query.from ? parseTimestamp(req.query.from, 'invalid_date') : '0000';
    const to = req.query.to ? parseTimestamp(req.query.to, 'invalid_date') : '9999';
    res.json(db.prepare(`${ENTRY_SELECT} WHERE e.user_id = ? AND e.start_at >= ? AND e.start_at < ? ORDER BY e.start_at DESC`)
      .all(req.user.id, from, to).map(withMinutes));
  });

  // ── Administración ──────────────────────────────────────────
  router.use(adminOnly);

  router.get('/companies', (req, res) => res.json(db.prepare('SELECT * FROM companies ORDER BY id').all()));

  router.get('/users', (req, res) => {
    const users = db.prepare(`
      SELECT u.*, c.code AS company_code,
        (SELECT COUNT(*) FROM assignments a WHERE a.user_id = u.id AND a.removed_at IS NULL) AS active_assignments,
        (SELECT w.ot_number FROM time_entries e JOIN work_orders w ON w.id = e.work_order_id
           WHERE e.user_id = u.id AND e.end_at IS NULL) AS clocked_in_ot
      FROM users u JOIN companies c ON c.id = u.company_id
      ORDER BY u.active DESC, c.code, u.full_name`).all();
    res.json(users.map((u) => ({ ...publicUser(u), active_assignments: u.active_assignments, clocked_in_ot: u.clocked_in_ot })));
  });

  const readUserFields = (body, existing = {}) => {
    const role = body.role ?? existing.role ?? 'worker';
    if (!['admin', 'worker'].includes(role)) throw new ApiError(400, 'invalid_role');
    const companyId = parseId(body.company_id ?? existing.company_id, 'company_required');
    if (!db.prepare('SELECT 1 FROM companies WHERE id = ?').get(companyId)) throw new ApiError(400, 'company_required');
    const lang = body.lang ?? existing.lang ?? 'es';
    if (!LANGS.includes(lang)) throw new ApiError(400, 'invalid_lang');
    return {
      full_name: requireText(body.full_name ?? existing.full_name, 'name_required'),
      doc_id: optionalText(body.doc_id ?? existing.doc_id),
      rank: optionalText(body.rank ?? existing.rank),
      role,
      company_id: companyId,
      lang,
    };
  };

  router.post('/users', (req, res) => {
    const username = requireText(req.body.username, 'username_required').toLowerCase();
    const password = String(req.body.password || '');
    if (password.length < 4) throw new ApiError(400, 'password_too_short');
    const fields = readUserFields(req.body);
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) throw new ApiError(409, 'username_taken');
    const result = db.prepare(`
      INSERT INTO users (username, full_name, doc_id, rank, password_hash, role, company_id, lang, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(username, fields.full_name, fields.doc_id, fields.rank, hashPassword(password), fields.role, fields.company_id, fields.lang, now());
    const id = Number(result.lastInsertRowid);
    audit(req.user.id, 'user.create', { user_id: id, username });
    res.status(201).json(publicUser(getUser(id)));
  });

  router.put('/users/:id', (req, res) => {
    const existing = getUser(parseId(req.params.id, 'user_not_found'));
    if (!existing) throw new ApiError(404, 'user_not_found');
    const fields = readUserFields(req.body, existing);
    const active = req.body.active === undefined ? Boolean(existing.active) : Boolean(req.body.active);
    if (existing.id === req.user.id && (!active || fields.role !== 'admin')) throw new ApiError(400, 'cannot_demote_self');

    transaction(db, () => {
      db.prepare('UPDATE users SET full_name = ?, doc_id = ?, rank = ?, role = ?, company_id = ?, lang = ?, active = ? WHERE id = ?')
        .run(fields.full_name, fields.doc_id, fields.rank, fields.role, fields.company_id, fields.lang, active ? 1 : 0, existing.id);
      if (req.body.password) {
        if (String(req.body.password).length < 4) throw new ApiError(400, 'password_too_short');
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(req.body.password)), existing.id);
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
      }
      if (!active) {
        const assignments = db.prepare('SELECT * FROM assignments WHERE user_id = ? AND removed_at IS NULL').all(existing.id);
        for (const assignment of assignments) removeAssignment(assignment, req.user.id, 'user_deactivated');
        closeOpenEntry(existing.id, req.user.id, null, 'user_deactivated');
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
      }
      audit(req.user.id, 'user.update', { user_id: existing.id, ...fields, active, password_reset: Boolean(req.body.password) });
    });
    res.json(publicUser(getUser(existing.id)));
  });

  router.get('/work-orders', (req, res) => {
    res.json(db.prepare(`
      SELECT w.*,
        (SELECT COUNT(*) FROM assignments a WHERE a.work_order_id = w.id AND a.removed_at IS NULL) AS active_assignments
      FROM work_orders w ORDER BY w.status DESC, w.created_at DESC`).all());
  });

  const readWorkOrderFields = (body, existing = {}) => {
    const status = body.status ?? existing.status ?? 'open';
    if (!['open', 'closed'].includes(status)) throw new ApiError(400, 'invalid_status');
    return {
      ot_number: requireText(body.ot_number ?? existing.ot_number, 'ot_number_required'),
      description: requireText(body.description ?? existing.description, 'description_required'),
      client: optionalText(body.client ?? existing.client),
      vessel: optionalText(body.vessel ?? existing.vessel),
      location: optionalText(body.location ?? existing.location),
      imo: optionalText(body.imo ?? existing.imo),
      flag: optionalText(body.flag ?? existing.flag),
      status,
    };
  };

  const assertOtNumberFree = (otNumber, ignoreId = 0) => {
    if (db.prepare('SELECT 1 FROM work_orders WHERE ot_number = ? AND id != ?').get(otNumber, ignoreId)) {
      throw new ApiError(409, 'ot_number_taken');
    }
  };

  router.post('/work-orders', (req, res) => {
    const fields = readWorkOrderFields(req.body);
    assertOtNumberFree(fields.ot_number);
    const result = db.prepare(`
      INSERT INTO work_orders (ot_number, description, client, vessel, location, imo, flag, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(fields.ot_number, fields.description, fields.client, fields.vessel, fields.location, fields.imo, fields.flag, fields.status, now());
    const id = Number(result.lastInsertRowid);
    audit(req.user.id, 'work_order.create', { work_order_id: id, ...fields });
    res.status(201).json(getWorkOrder(id));
  });

  router.put('/work-orders/:id', (req, res) => {
    const existing = getWorkOrder(parseId(req.params.id, 'work_order_not_found'));
    const fields = readWorkOrderFields(req.body, existing);
    assertOtNumberFree(fields.ot_number, existing.id);
    transaction(db, () => {
      db.prepare(`UPDATE work_orders SET ot_number = ?, description = ?, client = ?, vessel = ?, location = ?, imo = ?, flag = ?, status = ?
        WHERE id = ?`)
        .run(fields.ot_number, fields.description, fields.client, fields.vessel, fields.location, fields.imo, fields.flag, fields.status, existing.id);
      if (fields.status === 'closed' && existing.status !== 'closed') {
        const assignments = db.prepare('SELECT * FROM assignments WHERE work_order_id = ? AND removed_at IS NULL').all(existing.id);
        for (const assignment of assignments) removeAssignment(assignment, req.user.id, 'work_order_closed');
      }
      audit(req.user.id, 'work_order.update', { work_order_id: existing.id, ...fields });
    });
    res.json(getWorkOrder(existing.id));
  });

  router.get('/assignments', (req, res) => {
    const filters = ['1 = 1'];
    const params = [];
    if (req.query.work_order_id) { filters.push('a.work_order_id = ?'); params.push(parseId(req.query.work_order_id, 'invalid_id')); }
    if (req.query.user_id) { filters.push('a.user_id = ?'); params.push(parseId(req.query.user_id, 'invalid_id')); }
    if (req.query.active === '1') filters.push('a.removed_at IS NULL');
    res.json(db.prepare(`
      SELECT a.*, u.full_name AS user_name, c.code AS company_code, w.ot_number, w.description AS ot_description
      FROM assignments a
      JOIN users u ON u.id = a.user_id JOIN companies c ON c.id = u.company_id
      JOIN work_orders w ON w.id = a.work_order_id
      WHERE ${filters.join(' AND ')}
      ORDER BY a.removed_at IS NOT NULL, a.assigned_at DESC`).all(...params));
  });

  router.post('/assignments', (req, res) => {
    const userId = parseId(req.body.user_id, 'user_required');
    const workOrderId = parseId(req.body.work_order_id, 'work_order_required');
    const user = getUser(userId);
    if (!user || !user.active || user.role !== 'worker') throw new ApiError(400, 'invalid_worker');
    if (getWorkOrder(workOrderId).status !== 'open') throw new ApiError(400, 'work_order_closed');
    if (db.prepare('SELECT 1 FROM assignments WHERE user_id = ? AND work_order_id = ? AND removed_at IS NULL').get(userId, workOrderId)) {
      throw new ApiError(409, 'already_assigned');
    }
    const isForeman = req.body.is_foreman ? 1 : 0;
    const result = db.prepare('INSERT INTO assignments (user_id, work_order_id, assigned_at, assigned_by, is_foreman) VALUES (?, ?, ?, ?, ?)')
      .run(userId, workOrderId, now(), req.user.id, isForeman);
    audit(req.user.id, 'assignment.create', { assignment_id: Number(result.lastInsertRowid), user_id: userId, work_order_id: workOrderId, is_foreman: isForeman });
    res.status(201).json({ id: Number(result.lastInsertRowid) });
  });

  router.put('/assignments/:id', (req, res) => {
    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ? AND removed_at IS NULL').get(parseId(req.params.id, 'invalid_id'));
    if (!assignment) throw new ApiError(404, 'assignment_not_found');
    const isForeman = req.body.is_foreman ? 1 : 0;
    db.prepare('UPDATE assignments SET is_foreman = ? WHERE id = ?').run(isForeman, assignment.id);
    audit(req.user.id, 'assignment.update', { assignment_id: assignment.id, is_foreman: isForeman });
    res.json({ ok: true });
  });

  router.delete('/assignments/:id', (req, res) => {
    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ? AND removed_at IS NULL').get(parseId(req.params.id, 'invalid_id'));
    if (!assignment) throw new ApiError(404, 'assignment_not_found');
    transaction(db, () => removeAssignment(assignment, req.user.id, 'removed_by_admin'));
    res.json({ ok: true });
  });

  router.get('/entries', (req, res) => {
    const filters = ['1 = 1'];
    const params = [];
    if (req.query.from) { filters.push('e.start_at >= ?'); params.push(parseTimestamp(req.query.from, 'invalid_date')); }
    if (req.query.to) { filters.push('e.start_at < ?'); params.push(parseTimestamp(req.query.to, 'invalid_date')); }
    if (req.query.user_id) { filters.push('e.user_id = ?'); params.push(parseId(req.query.user_id, 'invalid_id')); }
    if (req.query.work_order_id) { filters.push('e.work_order_id = ?'); params.push(parseId(req.query.work_order_id, 'invalid_id')); }
    if (req.query.company_id) { filters.push('u.company_id = ?'); params.push(parseId(req.query.company_id, 'invalid_id')); }
    if (['pending', 'verified'].includes(req.query.status)) { filters.push('e.status = ?'); params.push(req.query.status); }
    if (req.query.open === '1') filters.push('e.end_at IS NULL');
    res.json(db.prepare(`${ENTRY_SELECT} WHERE ${filters.join(' AND ')} ORDER BY e.start_at, u.full_name`)
      .all(...params).map(withMinutes));
  });

  const readEntryTimes = (body, existing = {}) => {
    const start = parseTimestamp(body.start_at ?? existing.start_at, 'invalid_date');
    const rawEnd = body.end_at === undefined ? existing.end_at : body.end_at;
    const end = rawEnd ? parseTimestamp(rawEnd, 'invalid_date') : null;
    if (end && end <= start) throw new ApiError(400, 'end_before_start');
    return { start, end };
  };

  router.post('/entries', (req, res) => {
    const userId = parseId(req.body.user_id, 'user_required');
    const workOrderId = parseId(req.body.work_order_id, 'work_order_required');
    const user = getUser(userId);
    if (!user || user.role !== 'worker') throw new ApiError(400, 'invalid_worker');
    getWorkOrder(workOrderId);
    const { start, end } = readEntryTimes(req.body);
    if (!end) throw new ApiError(400, 'end_required');
    const place = parsePlace(req.body.place);
    const id = transaction(db, () => {
      assertNoOverlap(userId, start, end);
      const at = now();
      const result = db.prepare(`
        INSERT INTO time_entries (user_id, work_order_id, place, start_at, end_at, source, note, created_at, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, 'manual', ?, ?, ?, ?)`)
        .run(userId, workOrderId, place, start, end, optionalText(req.body.note), at, at, req.user.id);
      audit(req.user.id, 'entry.create', { entry_id: Number(result.lastInsertRowid), user_id: userId, work_order_id: workOrderId, place, start, end });
      return Number(result.lastInsertRowid);
    });
    res.status(201).json(getEntry(id));
  });

  // Una modificación de tiempos u OT anula la verificación previa: TMB debe volver a verificar.
  router.put('/entries/:id', (req, res) => {
    const existing = getEntry(parseId(req.params.id, 'entry_not_found'));
    const { start, end } = readEntryTimes(req.body, existing);
    const workOrderId = req.body.work_order_id ? parseId(req.body.work_order_id, 'invalid_id') : existing.work_order_id;
    getWorkOrder(workOrderId);
    const note = req.body.note === undefined ? existing.note : optionalText(req.body.note);
    const place = req.body.place === undefined ? existing.place : parsePlace(req.body.place);
    const changed = start !== existing.start_at || end !== existing.end_at || workOrderId !== existing.work_order_id
      || place !== existing.place;
    transaction(db, () => {
      assertNoOverlap(existing.user_id, start, end, existing.id);
      db.prepare(`
        UPDATE time_entries SET start_at = ?, end_at = ?, work_order_id = ?, place = ?, note = ?, updated_at = ?, updated_by = ?,
          status = CASE WHEN ? THEN 'pending' ELSE status END,
          verified_by = CASE WHEN ? THEN NULL ELSE verified_by END,
          verified_at = CASE WHEN ? THEN NULL ELSE verified_at END
        WHERE id = ?`)
        .run(start, end, workOrderId, place, note, now(), req.user.id, changed ? 1 : 0, changed ? 1 : 0, changed ? 1 : 0, existing.id);
      audit(req.user.id, 'entry.update', {
        entry_id: existing.id,
        before: { start: existing.start_at, end: existing.end_at, work_order_id: existing.work_order_id, place: existing.place, note: existing.note },
        after: { start, end, work_order_id: workOrderId, place, note },
      });
    });
    res.json(getEntry(existing.id));
  });

  router.delete('/entries/:id', (req, res) => {
    const existing = getEntry(parseId(req.params.id, 'entry_not_found'));
    db.prepare('DELETE FROM time_entries WHERE id = ?').run(existing.id);
    audit(req.user.id, 'entry.delete', { entry: existing });
    res.json({ ok: true });
  });

  router.post('/entries/verify', (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map((id) => parseId(id, 'invalid_id')) : [];
    if (!ids.length) throw new ApiError(400, 'no_entries_selected');
    const verified = req.body.verified !== false;
    const updated = transaction(db, () => {
      const at = now();
      let count = 0;
      for (const id of ids) {
        const result = verified
          ? db.prepare("UPDATE time_entries SET status = 'verified', verified_by = ?, verified_at = ? WHERE id = ? AND end_at IS NOT NULL")
            .run(req.user.id, at, id)
          : db.prepare("UPDATE time_entries SET status = 'pending', verified_by = NULL, verified_at = NULL WHERE id = ?").run(id);
        count += Number(result.changes);
      }
      audit(req.user.id, verified ? 'entry.verify' : 'entry.unverify', { ids });
      return count;
    });
    res.json({ updated });
  });

  router.get('/holidays', (req, res) => res.json(db.prepare('SELECT * FROM holidays ORDER BY date').all()));

  router.post('/holidays', (req, res) => {
    const date = typeof req.body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date) ? req.body.date : null;
    if (!date || Number.isNaN(Date.parse(date))) throw new ApiError(400, 'invalid_date');
    db.prepare('INSERT INTO holidays (date, name) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET name = excluded.name')
      .run(date, optionalText(req.body.name));
    audit(req.user.id, 'holiday.set', { date, name: optionalText(req.body.name) });
    res.status(201).json({ date });
  });

  router.delete('/holidays/:date', (req, res) => {
    db.prepare('DELETE FROM holidays WHERE date = ?').run(req.params.date);
    audit(req.user.id, 'holiday.delete', { date: req.params.date });
    res.json({ ok: true });
  });

  router.get('/audit', (req, res) => {
    res.json(db.prepare(`
      SELECT l.*, u.full_name AS user_name FROM audit_log l LEFT JOIN users u ON u.id = l.user_id
      ORDER BY l.id DESC LIMIT 300`).all());
  });

  // ── Errores ─────────────────────────────────────────────────
  router.use((err, req, res, next) => {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.code });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid_json' });
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  });

  return router;
};

module.exports = { createApi };
