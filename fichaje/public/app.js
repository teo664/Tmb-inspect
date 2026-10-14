// TMB Fichaje — aplicación cliente
const TOKEN_KEY = 'tmb_fichaje_token';
const state = { token: null, user: null, companies: [], timer: null };

// ── Utilidades ──────────────────────────────────────────────
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

const storage = {
  get: (key) => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* sin almacenamiento */ } },
  remove: (key) => { try { localStorage.removeItem(key); } catch { /* sin almacenamiento */ } },
};

const pad = (n) => String(n).padStart(2, '0');
const localDateKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const todayKey = () => localDateKey(new Date().toISOString());
const shiftDateKey = (key, days) => { const d = new Date(`${key}T00:00`); d.setDate(d.getDate() + days); return localDateKey(d.toISOString()); };
const dayStartIso = (key) => new Date(`${key}T00:00`).toISOString();
const dayEndIso = (key) => dayStartIso(shiftDateKey(key, 1));
const toInputDateTime = (iso) => { if (!iso) return ''; const d = new Date(iso); return `${localDateKey(iso)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fromInputDateTime = (value) => (value ? new Date(value).toISOString() : null);
const firstOfMonthKey = () => `${todayKey().slice(0, 8)}01`;
const mondayKey = () => { const d = new Date(); const offset = (d.getDay() + 6) % 7; return shiftDateKey(todayKey(), -offset); };

const locale = () => LOCALES[currentLang];
const fmtDate = (iso) => new Date(iso).toLocaleDateString(locale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDateKey = (key) => fmtDate(dayStartIso(key));
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDateTime = (iso) => `${fmtDate(iso)} ${fmtTime(iso)}`;
const fmtHours = (minutes) => (minutes == null ? '—' : (minutes / 60).toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtClock = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`; };
const sumMinutes = (entries) => entries.reduce((total, e) => total + (e.minutes ?? Math.round((Date.now() - Date.parse(e.start_at)) / 60000)), 0);

const placeLabel = (place) => tr(place === 'workshop' ? 'place_workshop' : 'place_board');

const statusBadge = (entry) => {
  if (!entry.end_at) return `<span class="badge badge-green">${tr('in_progress')}</span>`;
  return entry.status === 'verified'
    ? `<span class="badge badge-green">✓ ${tr('status_verified')}</span>`
    : `<span class="badge badge-amber">${tr('status_pending')}</span>`;
};

const toast = (message, isError = false) => {
  const el = $('#toast');
  el.textContent = message;
  el.className = `show${isError ? ' error' : ''}`;
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => { el.className = ''; }, 3500);
};

const errorMessage = (code) => (T[`err_${code}`] ? tr(`err_${code}`) : tr('err_generic'));

class ApiFailure extends Error {}

const api = async (method, path, body) => {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(state.token && { authorization: `Bearer ${state.token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiFailure(tr('err_network'));
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && state.token) {
    signOut();
    throw new ApiFailure(tr('err_unauthorized'));
  }
  if (!res.ok) throw new ApiFailure(errorMessage(data.error));
  return data;
};

// Ejecuta una acción mostrando el error al usuario en lugar de fallar en silencio.
const run = async (action) => {
  try {
    return await action();
  } catch (err) {
    toast(err instanceof ApiFailure ? err.message : tr('err_generic'), true);
    if (!(err instanceof ApiFailure)) console.error(err);
    return undefined;
  }
};

const options = (items, selected, label, value = (item) => item.id) => items
  .map((item) => `<option value="${esc(value(item))}"${String(value(item)) === String(selected) ? ' selected' : ''}>${esc(label(item))}</option>`)
  .join('');

// ── Diálogo genérico ────────────────────────────────────────
const openDialog = (title, bodyHtml, onSubmit) => {
  const dialog = $('#dialog');
  const form = $('#dialog-form');
  form.innerHTML = `
    <h2>${esc(title)}</h2>
    ${bodyHtml}
    <div class="dialog-actions">
      <button type="button" class="btn" data-close>${tr('cancel')}</button>
      <button type="submit" class="btn btn-primary">${tr('save')}</button>
    </div>`;
  $('[data-close]', form).onclick = () => dialog.close();
  form.onsubmit = async (event) => {
    event.preventDefault();
    const button = $('button[type=submit]', form);
    button.disabled = true;
    const ok = await run(() => onSubmit(new FormData(form), form));
    button.disabled = false;
    if (ok !== undefined) dialog.close();
  };
  dialog.showModal();
  return form;
};

// ── Sesión ──────────────────────────────────────────────────
const signOut = () => {
  if (state.token) fetch('/api/logout', { method: 'POST', headers: { authorization: `Bearer ${state.token}` } }).catch(() => {});
  state.token = null;
  state.user = null;
  storage.remove(TOKEN_KEY);
  render();
};

const changeLanguage = async (lang) => {
  setLang(lang);
  if (state.user) {
    const user = await run(() => api('PUT', '/me/lang', { lang }));
    if (user) state.user = user;
  }
  render();
};

const renderHeader = () => {
  $('#header-title').textContent = `TMB · ${tr('app_title')}`;
  document.title = `TMB · ${tr('app_title')}`;
  const select = $('#lang-select');
  select.innerHTML = LANGS.map((lang) => `<option value="${lang}"${lang === currentLang ? ' selected' : ''}>${lang.toUpperCase()}</option>`).join('');
  select.title = LANG_NAMES[currentLang];
  const logout = $('#btn-logout');
  logout.hidden = !state.user;
  logout.textContent = tr('logout');
};

const ADMIN_VIEWS = ['dashboard', 'workers', 'work-orders', 'entries', 'reports', 'holidays', 'audit'];
const ADMIN_LABELS = {
  dashboard: 'dashboard', workers: 'workers', 'work-orders': 'work_orders', entries: 'entries', reports: 'reports', holidays: 'holidays', audit: 'audit_log',
};

const currentRoute = () => {
  const [view = 'dashboard', id] = location.hash.replace(/^#\/?/, '').split('/');
  return { view: ADMIN_VIEWS.includes(view) ? view : 'dashboard', id };
};

const render = () => {
  clearInterval(state.timer);
  renderHeader();
  const nav = $('#admin-nav');
  nav.hidden = state.user?.role !== 'admin';
  if (!state.user) return renderLogin();
  if (state.user.role !== 'admin') return renderWorker();

  const route = currentRoute();
  nav.innerHTML = ADMIN_VIEWS
    .map((view) => `<a href="#/${view}" class="${view === route.view ? 'current' : ''}">${tr(ADMIN_LABELS[view])}</a>`)
    .join('');
  const views = {
    dashboard: renderDashboard,
    workers: renderWorkers,
    'work-orders': () => (route.id ? renderWorkOrderDetail(route.id) : renderWorkOrders()),
    entries: renderEntries,
    reports: renderReports,
    holidays: renderHolidays,
    audit: renderAudit,
  };
  return run(views[route.view]);
};

// ── Login ───────────────────────────────────────────────────
const renderLogin = () => {
  $('#view').innerHTML = `
    <form class="card login" id="login-form">
      <img src="/logo.jpg" alt="TMB">
      <h2>${tr('app_title')}</h2>
      <div class="field"><label for="login-user">${tr('username')}</label>
        <input id="login-user" name="username" autocomplete="username" autocapitalize="none" required></div>
      <div class="field"><label for="login-pass">${tr('password')}</label>
        <input id="login-pass" name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn btn-primary btn-huge">${tr('sign_in')}</button>
    </form>`;
  $('#login-form').onsubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    run(async () => {
      const result = await api('POST', '/login', { username: data.get('username'), password: data.get('password') });
      state.token = result.token;
      state.user = result.user;
      storage.set(TOKEN_KEY, result.token);
      setLang(result.user.lang);
      render();
    });
  };
};

const openPasswordDialog = () => openDialog(tr('change_password'), `
  <div class="field"><label>${tr('current_password')}</label><input name="current" type="password" required autocomplete="current-password"></div>
  <div class="field"><label>${tr('new_password')}</label><input name="password" type="password" required minlength="4" autocomplete="new-password"></div>`,
async (data) => {
  await api('PUT', '/me/password', { current: data.get('current'), password: data.get('password') });
  toast(tr('saved'));
  return true;
});

// ── Pantalla del operario ───────────────────────────────────
const renderWorker = async () => {
  const from = shiftDateKey(todayKey(), -30);
  const [{ open }, workOrders, entries] = await Promise.all([
    api('GET', '/my/status'),
    api('GET', '/my/work-orders'),
    api('GET', `/my/entries?from=${encodeURIComponent(dayStartIso(from))}`),
  ]);
  const todayMinutes = sumMinutes(entries.filter((e) => localDateKey(e.start_at) === todayKey()));
  const weekMinutes = sumMinutes(entries.filter((e) => localDateKey(e.start_at) >= mondayKey()));

  const statusHtml = open ? `
    <section class="card status-card working">
      <div class="muted">${tr('working_on')}</div>
      <div class="ot-big">${esc(open.ot_number)}</div>
      <div>${esc(open.ot_description)}</div>
      <div><span class="badge">${open.place === 'workshop' ? '🔧' : '⚓'} ${placeLabel(open.place)}</span></div>
      <div class="muted">${tr('since')} ${fmtDateTime(open.start_at)}</div>
      <div class="timer" id="timer">${fmtClock(Date.now() - Date.parse(open.start_at))}</div>
      <div class="field"><input id="clock-note" placeholder="${tr('note_optional')}"></div>
      <button class="btn btn-out btn-huge" id="btn-clock-out">⏹ ${tr('clock_out')}</button>
    </section>` : `
    <section class="card status-card">
      <div class="ot-big">${esc(tr('hello'))}, ${esc(state.user.full_name.split(' ')[0])}</div>
      <p class="muted">${tr('not_working')}</p>
      ${workOrders.length ? `
        <h3 style="margin-top:16px">${tr('select_ot')}</h3>
        <div class="ot-list">${workOrders.map((w) => `
          <button type="button" class="ot-option" data-ot="${w.id}" data-number="${esc(w.ot_number)}">
            <strong>${esc(w.ot_number)}</strong>${esc(w.description)}
            ${w.vessel || w.client ? `<div class="muted">${esc([w.vessel, w.client].filter(Boolean).join(' · '))}</div>` : ''}
          </button>`).join('')}</div>
        <h3 style="margin-top:16px">${tr('choose_place')}</h3>
        <div class="place-choice">
          <button type="button" class="ot-option place-option" data-place="board">⚓ <strong>${tr('place_board')}</strong></button>
          <button type="button" class="ot-option place-option" data-place="workshop">🔧 <strong>${tr('place_workshop')}</strong></button>
        </div>
        <div class="field" style="margin-top:12px"><input id="clock-note" placeholder="${tr('note_optional')}"></div>
        <button class="btn btn-in btn-huge" id="btn-clock-in" disabled>▶ ${tr('clock_in')}</button>`
        : `<p class="badge badge-amber" style="padding:10px 14px;margin-top:12px">${tr('no_assigned_ots')}</p>`}
    </section>`;

  $('#view').innerHTML = `
    ${statusHtml}
    <div class="totals">
      <div class="stat"><div class="value">${fmtHours(todayMinutes)}</div><div class="label">${tr('hours')} · ${tr('today')}</div></div>
      <div class="stat"><div class="value">${fmtHours(weekMinutes)}</div><div class="label">${tr('hours')} · ${tr('this_week')}</div></div>
    </div>
    <section class="card">
      <div class="spread"><h3>${tr('my_entries')} <span class="muted">· ${tr('last_days')}</span></h3>
        <button class="btn btn-small" id="btn-password">${tr('change_password')}</button></div>
      ${entries.length ? `<div class="table-wrap"><table>
        <thead><tr><th>${tr('date')}</th><th>${tr('ot')}</th><th>${tr('place')}</th><th>${tr('start')}</th><th>${tr('end')}</th><th class="num">${tr('hours')}</th><th></th></tr></thead>
        <tbody>${entries.map((e) => `<tr>
          <td>${fmtDate(e.start_at)}</td><td>${esc(e.ot_number)}</td><td>${placeLabel(e.place)}</td><td>${fmtTime(e.start_at)}</td><td>${fmtTime(e.end_at)}</td>
          <td class="num">${fmtHours(e.minutes)}</td><td>${statusBadge(e)}</td></tr>`).join('')}</tbody>
      </table></div>` : `<p class="muted">${tr('no_entries')}</p>`}
    </section>`;

  $('#btn-password').onclick = openPasswordDialog;

  if (open) {
    state.timer = setInterval(() => { $('#timer').textContent = fmtClock(Date.now() - Date.parse(open.start_at)); }, 1000);
    $('#btn-clock-out').onclick = () => {
      if (!confirm(tr('confirm_clock_out'))) return;
      run(async () => {
        await api('POST', '/my/clock-out', { note: $('#clock-note').value });
        render();
      });
    };
    return;
  }

  let selected = null;
  let place = null;
  const refreshClockIn = () => { $('#btn-clock-in').disabled = !(selected && place); };
  $$('.ot-option[data-ot]').forEach((button) => {
    button.onclick = () => {
      $$('.ot-option[data-ot]').forEach((b) => b.classList.remove('selected'));
      button.classList.add('selected');
      selected = button;
      refreshClockIn();
    };
  });
  $$('.place-option').forEach((button) => {
    button.onclick = () => {
      $$('.place-option').forEach((b) => b.classList.remove('selected'));
      button.classList.add('selected');
      place = button.dataset.place;
      refreshClockIn();
    };
  });
  // Con una sola OT asignada se preselecciona.
  const onlyOrder = $$('.ot-option[data-ot]');
  if (onlyOrder.length === 1) onlyOrder[0].click();
  const clockIn = $('#btn-clock-in');
  if (clockIn) {
    clockIn.onclick = () => {
      if (!selected || !place) return;
      if (!confirm(`${tr('confirm_clock_in', { ot: selected.dataset.number })}\n${placeLabel(place)}`)) return;
      run(async () => {
        await api('POST', '/my/clock-in', { work_order_id: Number(selected.dataset.ot), place, note: $('#clock-note').value });
        render();
      });
    };
  }
};

// ── Admin: panel ────────────────────────────────────────────
const renderDashboard = async () => {
  const [openEntries, pending, workOrders, users] = await Promise.all([
    api('GET', '/entries?open=1'),
    api('GET', '/entries?status=pending'),
    api('GET', '/work-orders'),
    api('GET', '/users'),
  ]);
  const pendingClosed = pending.filter((e) => e.end_at);
  $('#view').innerHTML = `
    <div class="stats">
      <div class="stat"><div class="value">${openEntries.length}</div><div class="label">${tr('currently_working')}</div></div>
      <div class="stat"><div class="value">${workOrders.filter((w) => w.status === 'open').length}</div><div class="label">${tr('open_ots')}</div></div>
      <a class="stat" href="#/entries" style="text-decoration:none;color:inherit"><div class="value">${pendingClosed.length}</div><div class="label">${tr('pending_verification')} →</div></a>
      <div class="stat"><div class="value">${users.filter((u) => u.active && u.role === 'worker').length}</div><div class="label">${tr('active_workers')}</div></div>
    </div>
    <section class="card">
      <h3>${tr('currently_working')}</h3>
      ${openEntries.length ? `<div class="table-wrap"><table>
        <thead><tr><th>${tr('worker')}</th><th>${tr('company')}</th><th>${tr('ot')}</th><th>${tr('start')}</th><th class="num">${tr('hours')}</th></tr></thead>
        <tbody>${openEntries.map((e) => `<tr><td>${esc(e.user_name)}</td><td>${esc(e.company_code)}</td>
          <td><strong>${esc(e.ot_number)}</strong> <span class="muted">${esc(e.ot_description)}</span></td>
          <td>${fmtDateTime(e.start_at)}</td><td class="num">${fmtHours(sumMinutes([e]))}</td></tr>`).join('')}</tbody>
      </table></div>` : `<p class="muted">${tr('nobody_working')}</p>`}
    </section>`;
};

// ── Admin: usuarios ─────────────────────────────────────────
const ensureCompanies = async () => {
  if (!state.companies.length) state.companies = await api('GET', '/companies');
  return state.companies;
};

const userFormHtml = (user = {}) => `
  ${user.id ? '' : `<div class="field"><label>${tr('username')}</label><input name="username" required autocapitalize="none"></div>`}
  <div class="field"><label>${tr('full_name')}</label><input name="full_name" required value="${esc(user.full_name)}"></div>
  <div class="field"><label>${tr('doc_id')}</label><input name="doc_id" value="${esc(user.doc_id)}"></div>
  <div class="row">
    <div class="field"><label>${tr('company')}</label><select name="company_id" required>
      ${options(state.companies, user.company_id ?? state.companies.find((c) => c.code !== 'TMB')?.id, (c) => c.code)}</select></div>
    <div class="field"><label>${tr('role')}</label><select name="role">
      ${options([{ id: 'worker' }, { id: 'admin' }], user.role ?? 'worker', (r) => tr(`role_${r.id}`))}</select></div>
    <div class="field"><label>${tr('language')}</label><select name="lang">
      ${options(LANGS.map((id) => ({ id })), user.lang ?? currentLang, (l) => LANG_NAMES[l.id])}</select></div>
  </div>
  <div class="field"><label>${user.id ? tr('password_leave_blank') : tr('password')}</label>
    <input name="password" type="text" autocomplete="new-password" ${user.id ? '' : 'required'} minlength="4"></div>`;

const readUserForm = (data) => ({
  username: data.get('username') ?? undefined,
  full_name: data.get('full_name'),
  doc_id: data.get('doc_id'),
  company_id: Number(data.get('company_id')),
  role: data.get('role'),
  lang: data.get('lang'),
  password: data.get('password') || undefined,
});

const renderWorkers = async () => {
  await ensureCompanies();
  const users = await api('GET', '/users');
  $('#view').innerHTML = `
    <div class="spread"><h2>${tr('workers')}</h2>
      <div class="actions">
        <select id="company-filter" style="width:auto"><option value="">${tr('company')}: ${tr('all')}</option>${options(state.companies, '', (c) => c.code)}</select>
        <button class="btn btn-primary" id="btn-new-user">+ ${tr('new_worker')}</button>
      </div></div>
    <section class="card table-wrap"><table>
      <thead><tr><th>${tr('full_name')}</th><th>${tr('username')}</th><th>${tr('company')}</th><th class="hide-mobile">${tr('doc_id')}</th>
        <th>${tr('assigned_ots')}</th><th>${tr('status')}</th><th></th></tr></thead>
      <tbody>${users.map((u) => `<tr class="${u.active ? '' : 'inactive'}" data-company="${u.company_id}">
        <td><strong>${esc(u.full_name)}</strong>${u.role === 'admin' ? ` <span class="badge">${tr('role_admin')}</span>` : ''}</td>
        <td>${esc(u.username)}</td><td>${esc(u.company_code)}</td><td class="hide-mobile">${esc(u.doc_id)}</td>
        <td>${u.role === 'worker' ? u.active_assignments : ''}
          ${u.clocked_in_ot ? `<span class="badge badge-green">${tr('clocked_in_on')} ${esc(u.clocked_in_ot)}</span>` : ''}</td>
        <td>${u.active ? `<span class="badge badge-green">${tr('active')}</span>` : `<span class="badge">${tr('inactive')}</span>`}</td>
        <td class="actions">
          <button class="btn btn-small" data-edit="${u.id}">${tr('edit')}</button>
          ${u.id === state.user.id ? '' : `<button class="btn btn-small ${u.active ? 'btn-danger' : ''}" data-toggle="${u.id}">${u.active ? tr('deactivate') : tr('activate')}</button>`}
        </td></tr>`).join('')}</tbody>
    </table></section>`;

  $('#company-filter').onchange = (event) => {
    $$('tbody tr').forEach((row) => { row.hidden = Boolean(event.target.value) && row.dataset.company !== event.target.value; });
  };
  $('#btn-new-user').onclick = () => openDialog(tr('new_worker'), userFormHtml(), async (data) => {
    await api('POST', '/users', readUserForm(data));
    toast(tr('saved'));
    render();
    return true;
  });
  $$('[data-edit]').forEach((button) => {
    const user = users.find((u) => u.id === Number(button.dataset.edit));
    button.onclick = () => openDialog(tr('edit_user'), userFormHtml(user), async (data) => {
      await api('PUT', `/users/${user.id}`, readUserForm(data));
      toast(tr('saved'));
      render();
      return true;
    });
  });
  $$('[data-toggle]').forEach((button) => {
    const user = users.find((u) => u.id === Number(button.dataset.toggle));
    button.onclick = () => {
      if (user.active && !confirm(tr('confirm_deactivate', { name: user.full_name }))) return;
      run(async () => {
        await api('PUT', `/users/${user.id}`, { active: !user.active });
        render();
      });
    };
  });
};

// ── Admin: órdenes de trabajo ───────────────────────────────
const workOrderFormHtml = (order = {}) => `
  <div class="row">
    <div class="field"><label>${tr('ot_number')}</label><input name="ot_number" required value="${esc(order.ot_number)}"></div>
    <div class="field"><label>${tr('client')}</label><input name="client" value="${esc(order.client)}"></div>
  </div>
  <div class="field"><label>${tr('description')}</label><textarea name="description" rows="3" required>${esc(order.description)}</textarea></div>
  <div class="row">
    <div class="field"><label>${tr('vessel')}</label><input name="vessel" value="${esc(order.vessel)}"></div>
    <div class="field"><label>${tr('location')}</label><input name="location" value="${esc(order.location)}"></div>
  </div>`;

const readWorkOrderForm = (data) => ({
  ot_number: data.get('ot_number'),
  description: data.get('description'),
  client: data.get('client'),
  vessel: data.get('vessel'),
  location: data.get('location'),
});

const otStatusBadge = (order) => (order.status === 'open'
  ? `<span class="badge badge-green">${tr('status_open')}</span>`
  : `<span class="badge">${tr('status_closed')}</span>`);

const renderWorkOrders = async () => {
  const orders = await api('GET', '/work-orders');
  $('#view').innerHTML = `
    <div class="spread"><h2>${tr('work_orders')}</h2><button class="btn btn-primary" id="btn-new-ot">+ ${tr('new_ot')}</button></div>
    <section class="card table-wrap"><table>
      <thead><tr><th>${tr('ot_number')}</th><th>${tr('description')}</th><th class="hide-mobile">${tr('client')}</th>
        <th class="hide-mobile">${tr('vessel')}</th><th class="num">${tr('workers')}</th><th>${tr('status')}</th></tr></thead>
      <tbody>${orders.map((o) => `<tr class="${o.status === 'open' ? '' : 'inactive'}">
        <td><a href="#/work-orders/${o.id}"><strong>${esc(o.ot_number)}</strong></a></td><td>${esc(o.description)}</td>
        <td class="hide-mobile">${esc(o.client)}</td><td class="hide-mobile">${esc(o.vessel)}</td>
        <td class="num">${o.active_assignments}</td><td>${otStatusBadge(o)}</td></tr>`).join('')}</tbody>
    </table></section>`;
  $('#btn-new-ot').onclick = () => openDialog(tr('new_ot'), workOrderFormHtml(), async (data) => {
    const order = await api('POST', '/work-orders', readWorkOrderForm(data));
    location.hash = `#/work-orders/${order.id}`;
    return true;
  });
};

const renderWorkOrderDetail = async (id) => {
  const [orders, assignments, users] = await Promise.all([
    api('GET', '/work-orders'),
    api('GET', `/assignments?work_order_id=${encodeURIComponent(id)}`),
    api('GET', '/users'),
  ]);
  const order = orders.find((o) => String(o.id) === id);
  if (!order) { location.hash = '#/work-orders'; return; }
  const active = assignments.filter((a) => !a.removed_at);
  const past = assignments.filter((a) => a.removed_at);
  const assignedIds = new Set(active.map((a) => a.user_id));
  const available = users.filter((u) => u.active && u.role === 'worker' && !assignedIds.has(u.id));

  $('#view').innerHTML = `
    <p><a href="#/work-orders">← ${tr('work_orders')}</a></p>
    <section class="card">
      <div class="spread"><h2>${esc(order.ot_number)} ${otStatusBadge(order)}</h2>
        <div class="actions">
          <button class="btn" id="btn-edit-ot">${tr('edit')}</button>
          <button class="btn ${order.status === 'open' ? 'btn-danger' : ''}" id="btn-toggle-ot">${order.status === 'open' ? tr('close_ot') : tr('reopen_ot')}</button>
        </div></div>
      <p>${esc(order.description)}</p>
      <p class="muted">${[[tr('client'), order.client], [tr('vessel'), order.vessel], [tr('location'), order.location]]
    .filter(([, v]) => v).map(([k, v]) => `${k}: ${esc(v)}`).join(' · ')}</p>
    </section>
    <section class="card">
      <h3>${tr('assigned_workers')}</h3>
      ${order.status === 'open' ? `<form class="row" id="assign-form" style="margin-bottom:12px">
        <select name="user_id" required><option value="">${tr('worker')}…</option>
          ${options(available, '', (u) => `${u.full_name} (${u.company_code})`)}</select>
        <label class="check" style="flex:0 0 auto"><input type="checkbox" name="is_foreman"> ${tr('foreman')}</label>
        <button class="btn btn-primary" style="flex:0 0 auto">${tr('assign')}</button></form>` : ''}
      ${active.length ? `<div class="table-wrap"><table>
        <thead><tr><th>${tr('worker')}</th><th>${tr('company')}</th><th>${tr('foreman')}</th><th>${tr('assigned_since')}</th><th></th></tr></thead>
        <tbody>${active.map((a) => `<tr><td>${esc(a.user_name)}</td><td>${esc(a.company_code)}</td>
          <td><input type="checkbox" data-foreman="${a.id}" ${a.is_foreman ? 'checked' : ''} aria-label="${tr('foreman')}"></td>
          <td>${fmtDate(a.assigned_at)}</td>
          <td><button class="btn btn-small btn-danger" data-remove="${a.id}" data-name="${esc(a.user_name)}">${tr('remove_from_ot')}</button></td></tr>`).join('')}</tbody>
      </table></div>` : `<p class="muted">${tr('no_workers_assigned')}</p>`}
      ${past.length ? `<h3 style="margin-top:16px">${tr('history')}</h3><ul class="muted" style="padding-left:18px">
        ${past.map((a) => `<li>${esc(a.user_name)} (${esc(a.company_code)}) — ${fmtDate(a.assigned_at)} → ${tr('removed_on')} ${fmtDate(a.removed_at)}</li>`).join('')}</ul>` : ''}
    </section>`;

  $('#btn-edit-ot').onclick = () => openDialog(tr('edit_ot'), workOrderFormHtml(order), async (data) => {
    await api('PUT', `/work-orders/${order.id}`, readWorkOrderForm(data));
    render();
    return true;
  });
  $('#btn-toggle-ot').onclick = () => {
    const closing = order.status === 'open';
    if (closing && !confirm(tr('confirm_close_ot', { ot: order.ot_number }))) return;
    run(async () => {
      await api('PUT', `/work-orders/${order.id}`, { status: closing ? 'closed' : 'open' });
      render();
    });
  };
  const assignForm = $('#assign-form');
  if (assignForm) {
    assignForm.onsubmit = (event) => {
      event.preventDefault();
      run(async () => {
        const data = new FormData(assignForm);
        await api('POST', '/assignments', { user_id: Number(data.get('user_id')), work_order_id: order.id, is_foreman: data.has('is_foreman') });
        render();
      });
    };
  }
  $$('[data-foreman]').forEach((box) => {
    box.onchange = () => run(async () => {
      await api('PUT', `/assignments/${box.dataset.foreman}`, { is_foreman: box.checked });
      toast(tr('saved'));
    });
  });
  $$('[data-remove]').forEach((button) => {
    button.onclick = () => {
      if (!confirm(tr('confirm_remove', { name: button.dataset.name, ot: order.ot_number }))) return;
      run(async () => {
        await api('DELETE', `/assignments/${button.dataset.remove}`);
        render();
      });
    };
  });
};

// ── Admin: fichajes ─────────────────────────────────────────
const entryFilters = { from: null, to: null, company_id: '', user_id: '', work_order_id: '', status: 'pending' };

const entryQuery = (filters) => {
  const params = new URLSearchParams();
  params.set('from', dayStartIso(filters.from));
  params.set('to', dayEndIso(filters.to));
  for (const key of ['company_id', 'user_id', 'work_order_id', 'status']) if (filters[key]) params.set(key, filters[key]);
  return params.toString();
};

const entryFormHtml = (entry, users, orders) => `
  ${entry.id ? `<p class="muted">${esc(entry.user_name)} · ${esc(entry.company_code)}</p>` : `
    <div class="field"><label>${tr('worker')}</label><select name="user_id" required><option value=""></option>
      ${options(users.filter((u) => u.role === 'worker'), '', (u) => `${u.full_name} (${u.company_code})`)}</select></div>`}
  <div class="field"><label>${tr('ot')}</label><select name="work_order_id" required>${entry.id ? '' : '<option value=""></option>'}
    ${options(orders, entry.work_order_id, (o) => `${o.ot_number} — ${o.description}`)}</select></div>
  <div class="field"><label>${tr('place')}</label><select name="place" required>
    ${options([{ id: 'board' }, { id: 'workshop' }], entry.place ?? 'board', (p) => placeLabel(p.id))}</select></div>
  <div class="row">
    <div class="field"><label>${tr('start')}</label><input type="datetime-local" name="start_at" required value="${toInputDateTime(entry.start_at)}"></div>
    <div class="field"><label>${tr('end')}</label><input type="datetime-local" name="end_at" ${entry.id && !entry.end_at ? '' : 'required'} value="${toInputDateTime(entry.end_at)}"></div>
  </div>
  <div class="field"><label>${tr('note')}</label><input name="note" value="${esc(entry.note)}"></div>
  ${entry.id ? `<p class="muted">${tr('edit_resets_verification')}</p>` : ''}`;

const renderEntries = async () => {
  entryFilters.from ??= firstOfMonthKey();
  entryFilters.to ??= todayKey();
  await ensureCompanies();
  const [users, orders, entries] = await Promise.all([
    api('GET', '/users'),
    api('GET', '/work-orders'),
    api('GET', `/entries?${entryQuery(entryFilters)}`),
  ]);
  const f = entryFilters;
  $('#view').innerHTML = `
    <div class="spread"><h2>${tr('entries')}</h2><button class="btn btn-primary" id="btn-add-entry">+ ${tr('add_entry')}</button></div>
    <form class="card row" id="entry-filters">
      <div><label>${tr('from')}</label><input type="date" name="from" value="${f.from}" required></div>
      <div><label>${tr('to')}</label><input type="date" name="to" value="${f.to}" required></div>
      <div><label>${tr('company')}</label><select name="company_id"><option value="">${tr('all')}</option>${options(state.companies, f.company_id, (c) => c.code)}</select></div>
      <div><label>${tr('worker')}</label><select name="user_id"><option value="">${tr('all')}</option>
        ${options(users.filter((u) => u.role === 'worker'), f.user_id, (u) => u.full_name)}</select></div>
      <div><label>${tr('ot')}</label><select name="work_order_id"><option value="">${tr('all')}</option>${options(orders, f.work_order_id, (o) => o.ot_number)}</select></div>
      <div><label>${tr('status')}</label><select name="status"><option value="">${tr('all')}</option>
        ${options([{ id: 'pending' }, { id: 'verified' }], f.status, (s) => tr(`status_${s.id}`))}</select></div>
      <button class="btn btn-primary" style="flex:0 0 auto">${tr('search')}</button>
    </form>
    <section class="card">
      <div class="spread">
        <strong>${entries.length} · ${tr('total_hours')}: ${fmtHours(sumMinutes(entries.filter((e) => e.end_at)))}</strong>
        <div class="actions">
          <span class="muted" id="selected-count"></span>
          <button class="btn btn-small btn-primary" id="btn-verify" disabled>✓ ${tr('verify_selected')}</button>
          <button class="btn btn-small" id="btn-unverify" disabled>${tr('unverify_selected')}</button>
        </div>
      </div>
      ${entries.length ? `<div class="table-wrap"><table>
        <thead><tr><th><input type="checkbox" id="check-all" aria-label="${tr('all')}"></th><th>${tr('date')}</th><th>${tr('worker')}</th>
          <th>${tr('company')}</th><th>${tr('ot')}</th><th>${tr('place')}</th><th>${tr('start')}</th><th>${tr('end')}</th><th class="num">${tr('hours')}</th>
          <th>${tr('status')}</th><th></th></tr></thead>
        <tbody>${entries.map((e) => `<tr>
          <td>${e.end_at ? `<input type="checkbox" class="entry-check" value="${e.id}">` : ''}</td>
          <td>${fmtDate(e.start_at)}</td><td>${esc(e.user_name)}</td><td>${esc(e.company_code)}</td>
          <td title="${esc(e.ot_description)}">${esc(e.ot_number)}</td>
          <td>${placeLabel(e.place)}</td>
          <td>${fmtTime(e.start_at)}</td>
          <td>${e.end_at ? (localDateKey(e.end_at) === localDateKey(e.start_at) ? fmtTime(e.end_at) : fmtDateTime(e.end_at)) : '—'}</td>
          <td class="num">${fmtHours(e.minutes)}</td>
          <td>${statusBadge(e)}${e.source === 'manual' ? ` <span class="badge">${tr('manual')}</span>` : ''}
            ${e.note ? `<div class="muted">${esc(e.note)}</div>` : ''}</td>
          <td class="actions"><button class="btn btn-small" data-edit="${e.id}">${tr('edit')}</button>
            <button class="btn btn-small btn-danger" data-delete="${e.id}" aria-label="${tr('delete')}">✕</button></td>
        </tr>`).join('')}</tbody></table></div>` : `<p class="muted">${tr('no_entries')}</p>`}
    </section>`;

  $('#entry-filters').onsubmit = (event) => {
    event.preventDefault();
    Object.assign(entryFilters, Object.fromEntries(new FormData(event.target)));
    render();
  };

  const selectedIds = () => $$('.entry-check:checked').map((box) => Number(box.value));
  const updateSelection = () => {
    const count = selectedIds().length;
    $('#selected-count').textContent = count ? `${count} ${tr('selected')}` : '';
    $('#btn-verify').disabled = !count;
    $('#btn-unverify').disabled = !count;
  };
  $$('.entry-check').forEach((box) => { box.onchange = updateSelection; });
  const checkAll = $('#check-all');
  if (checkAll) checkAll.onchange = () => { $$('.entry-check').forEach((box) => { box.checked = checkAll.checked; }); updateSelection(); };

  const setVerified = (verified) => run(async () => {
    await api('POST', '/entries/verify', { ids: selectedIds(), verified });
    render();
  });
  $('#btn-verify').onclick = () => setVerified(true);
  $('#btn-unverify').onclick = () => setVerified(false);

  $('#btn-add-entry').onclick = () => openDialog(tr('add_entry'), entryFormHtml({}, users, orders), async (data) => {
    await api('POST', '/entries', {
      user_id: Number(data.get('user_id')),
      work_order_id: Number(data.get('work_order_id')),
      start_at: fromInputDateTime(data.get('start_at')),
      end_at: fromInputDateTime(data.get('end_at')),
      place: data.get('place'),
      note: data.get('note'),
    });
    render();
    return true;
  });
  $$('[data-edit]').forEach((button) => {
    const entry = entries.find((e) => e.id === Number(button.dataset.edit));
    button.onclick = () => openDialog(tr('edit_entry'), entryFormHtml(entry, users, orders), async (data) => {
      await api('PUT', `/entries/${entry.id}`, {
        work_order_id: Number(data.get('work_order_id')),
        start_at: fromInputDateTime(data.get('start_at')),
        end_at: fromInputDateTime(data.get('end_at')),
        place: data.get('place'),
        note: data.get('note'),
      });
      render();
      return true;
    });
  });
  $$('[data-delete]').forEach((button) => {
    button.onclick = () => {
      if (!confirm(tr('confirm_delete_entry'))) return;
      run(async () => {
        await api('DELETE', `/entries/${button.dataset.delete}`);
        render();
      });
    };
  });
};

// ── Admin: informes ─────────────────────────────────────────
const renderReports = async () => {
  await ensureCompanies();
  const [orders, users] = await Promise.all([api('GET', '/work-orders'), api('GET', '/users')]);
  const subcontractors = state.companies.filter((c) => c.code !== 'TMB');
  const langSelect = `<select name="lang">${options(LANGS.map((id) => ({ id })), currentLang, (l) => LANG_NAMES[l.id])}</select>`;
  const periodFields = `
    <div><label>${tr('from')}</label><input type="date" name="from" value="${firstOfMonthKey()}" required></div>
    <div><label>${tr('to')}</label><input type="date" name="to" value="${todayKey()}" required></div>`;

  $('#view').innerHTML = `
    <h2>${tr('reports')}</h2>
    <form class="card" id="timesheet-form">
      <h3>📋 ${tr('timesheet')}</h3><p class="muted" style="margin-bottom:12px">${tr('timesheet_desc')}</p>
      <div class="row">
        <div><label>${tr('ot')}</label><select name="work_order_id" required><option value="">${tr('choose_ot')}</option>
          ${options(orders, '', (o) => `${o.ot_number} — ${o.description}`)}</select></div>
        <div><label>${tr('company')}</label><select name="company_id"><option value="">${tr('all')}</option>${options(subcontractors, '', (c) => c.code)}</select></div>
        ${periodFields}
      </div>
      <p class="muted" style="margin-top:12px">${tr('timesheet_english')}</p>
      <label class="check" style="margin:12px 0"><input type="checkbox" name="only_verified" checked> ${tr('only_verified')}</label>
      <div class="actions"><button class="btn btn-primary" name="action" value="print">🖨 ${tr('print_pdf')}</button>
        <button class="btn" name="action" value="csv">${tr('export_csv')}</button></div>
    </form>
    <form class="card" id="summary-form">
      <h3>🧾 ${tr('summary')}</h3><p class="muted" style="margin-bottom:12px">${tr('summary_desc')}</p>
      <div class="row">
        <div><label>${tr('company')}</label><select name="company_id" required><option value="">${tr('choose_company')}</option>
          ${options(subcontractors, '', (c) => `${c.code}`)}</select></div>
        <div><label>${tr('worker')}</label><select name="user_id"><option value="">${tr('all')}</option>
          ${options(users.filter((u) => u.role === 'worker'), '', (u) => `${u.full_name} (${u.company_code})`)}</select></div>
        ${periodFields}
        <div><label>${tr('report_language')}</label>${langSelect}</div>
      </div>
      <p class="muted" style="margin:12px 0">✓ ${tr('only_verified')}</p>
      <div class="actions"><button class="btn btn-primary" name="action" value="print">🖨 ${tr('print_pdf')}</button>
        <button class="btn" name="action" value="csv">${tr('export_csv')}</button></div>
    </form>`;

  const wireReport = (form, build) => {
    form.onsubmit = (event) => {
      event.preventDefault();
      const action = event.submitter?.value || 'print';
      const params = Object.fromEntries(new FormData(form));
      // La ventana se abre antes de pedir datos: los navegadores bloquean ventanas abiertas tras un await.
      const win = action === 'print' ? window.open('', '_blank') : null;
      if (action === 'print' && !win) { toast(tr('popup_blocked'), true); return; }
      run(async () => {
        const report = await build(params);
        if (action === 'csv') downloadCsv(report.csvName, report.csv);
        else writeReportWindow(win, report.html);
      }).finally(() => { if (win && !win.document.body.innerHTML) win.close(); });
    };
  };

  wireReport($('#timesheet-form'), async (p) => {
    const order = orders.find((o) => String(o.id) === p.work_order_id);
    // Se clasifican todos los fichajes del periodo (de cualquier OT): el límite de 8 h normales es por operario y día.
    const [allEntries, holidays] = await Promise.all([
      api('GET', `/entries?${entryQuery({ from: p.from, to: p.to })}`),
      api('GET', '/holidays'),
    ]);
    const classified = classifyEntries(allEntries, new Set(holidays.map((h) => h.date)));
    const ofOrder = allEntries.filter((e) => e.end_at && String(e.work_order_id) === p.work_order_id
      && (!p.company_id || String(e.company_id) === p.company_id));
    const entries = p.only_verified ? ofOrder.filter((e) => e.status === 'verified') : ofOrder;
    const pending = ofOrder.filter((e) => e.status !== 'verified').length;
    return buildTimesheet({ order, entries, classified, from: p.from, to: p.to, pending, onlyVerified: Boolean(p.only_verified) });
  });

  wireReport($('#summary-form'), async (p) => {
    const company = state.companies.find((c) => String(c.id) === p.company_id);
    const query = { from: p.from, to: p.to, company_id: p.company_id, user_id: p.user_id };
    const entries = (await api('GET', `/entries?${entryQuery({ ...query, status: 'verified' })}`)).filter((e) => e.end_at);
    const pending = (await api('GET', `/entries?${entryQuery({ ...query, status: 'pending' })}`)).length;
    return buildSummary({ company, entries, from: p.from, to: p.to, lang: p.lang, pending });
  });
};

// ── Admin: festivos ─────────────────────────────────────────
const renderHolidays = async () => {
  const holidays = await api('GET', '/holidays');
  $('#view').innerHTML = `
    <h2>${tr('holidays')}</h2>
    <p class="muted" style="margin-bottom:12px">${tr('holidays_desc')}</p>
    <form class="card row" id="holiday-form">
      <div><label>${tr('date')}</label><input type="date" name="date" required></div>
      <div><label>${tr('holiday_name')}</label><input name="name"></div>
      <button class="btn btn-primary" style="flex:0 0 auto">+ ${tr('add_holiday')}</button>
    </form>
    <section class="card">
      ${holidays.length ? `<table><tbody>${holidays.map((h) => `<tr><td>${fmtDateKey(h.date)}</td><td>${esc(h.name)}</td>
        <td class="num"><button class="btn btn-small btn-danger" data-delete="${esc(h.date)}" aria-label="${tr('delete')}">✕</button></td></tr>`).join('')}
      </tbody></table>` : `<p class="muted">${tr('no_holidays')}</p>`}
    </section>`;
  $('#holiday-form').onsubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    run(async () => {
      await api('POST', '/holidays', { date: data.get('date'), name: data.get('name') });
      render();
    });
  };
  $$('[data-delete]').forEach((button) => {
    button.onclick = () => run(async () => {
      await api('DELETE', `/holidays/${encodeURIComponent(button.dataset.delete)}`);
      render();
    });
  });
};

// ── Admin: registro de cambios ──────────────────────────────
const renderAudit = async () => {
  const rows = await api('GET', '/audit');
  $('#view').innerHTML = `
    <h2>${tr('audit_log')}</h2>
    <section class="card table-wrap"><table>
      <thead><tr><th>${tr('date')}</th><th>${tr('by_user')}</th><th>${tr('action')}</th><th>${tr('detail')}</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td style="white-space:nowrap">${fmtDateTime(r.at)}</td><td>${esc(r.user_name)}</td>
        <td><code>${esc(r.action)}</code></td><td class="muted" style="word-break:break-word">${esc(r.detail)}</td></tr>`).join('')}</tbody>
    </table></section>`;
};

// ── Arranque ────────────────────────────────────────────────
const boot = async () => {
  setLang(detectLang());
  $('#lang-select').onchange = (event) => changeLanguage(event.target.value);
  $('#btn-logout').onclick = signOut;
  window.addEventListener('hashchange', render);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.user?.role === 'worker') render();
  });

  state.token = storage.get(TOKEN_KEY);
  if (state.token) {
    $('#view').innerHTML = `<p class="muted">${tr('loading')}</p>`;
    state.user = await run(() => api('GET', '/me')) ?? null;
    if (!state.user) { state.token = null; storage.remove(TOKEN_KEY); }
    else setLang(state.user.lang);
  }
  render();
};

boot();
