// TMB Fichaje — modo «ordenador de fichaje» (terminal compartido de la empresa).
// Flujo: tocar el nombre → PIN de 4 cifras → elegir OT y lugar → fichar → confirmación → vuelta al inicio.
// La sesión del operario se cierra siempre al terminar o tras un rato sin tocar nada.

const TERMINAL_KEY = 'tmb_fichaje_terminal';
const KIOSK_IDLE_MS = 30000;
const KIOSK_DONE_MS = 4000;
const PIN_LENGTH = 4;

const kiosk = { terminal: null, worker: null, session: null, pin: '', chosenLang: null, idleTimer: null, clockTimer: null };

const loadTerminal = () => {
  try { return JSON.parse(storage.get(TERMINAL_KEY) || 'null'); } catch { return null; }
};

const saveTerminal = (terminal) => storage.set(TERMINAL_KEY, JSON.stringify(terminal));

// Al dejar de ser terminal, el ordenador vuelve a la primera pantalla (idioma y dispositivo).
const forgetTerminal = () => {
  storage.remove(TERMINAL_KEY);
  storage.remove(DEVICE_KEY);
  kiosk.terminal = null;
};

class KioskFailure extends Error {
  constructor(code) {
    super(errorMessage(code));
    this.code = code;
  }
}

const kioskApi = async (method, path, body, sessionToken) => {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-terminal-token': kiosk.terminal.token,
        ...(sessionToken && { authorization: `Bearer ${sessionToken}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new KioskFailure('network');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new KioskFailure(data.error);
  return data;
};

// Muestra el error; si el terminal ha sido desactivado, el ordenador vuelve a la pantalla inicial.
const kioskRun = async (action) => {
  try {
    return await action();
  } catch (err) {
    if (err.code === 'terminal_unauthorized') {
      forgetTerminal();
      toast(err.message, true);
      render();
      return undefined;
    }
    toast(err instanceof KioskFailure ? err.message : tr('err_generic'), true);
    if (!(err instanceof KioskFailure)) console.error(err);
    return undefined;
  }
};

const stopKioskTimers = () => {
  clearTimeout(kiosk.idleTimer);
  clearInterval(kiosk.clockTimer);
};

const armIdle = (ms = KIOSK_IDLE_MS) => {
  clearTimeout(kiosk.idleTimer);
  kiosk.idleTimer = setTimeout(endKioskSession, ms);
};

// Cierra la sesión del operario y deja el terminal listo para el siguiente.
const endKioskSession = () => {
  if (kiosk.session) {
    fetch('/api/logout', { method: 'POST', headers: { authorization: `Bearer ${kiosk.session}` } }).catch(() => {});
  }
  kiosk.session = null;
  kiosk.worker = null;
  kiosk.pin = '';
  kiosk.chosenLang = null;
  setLang(kiosk.terminal?.lang || 'es');
  if (kiosk.terminal) renderKioskNames();
};

const kioskLangButtons = () => `
  <div class="kiosk-langs">${LANGS.map((lang) => `
    <button type="button" class="kiosk-lang${lang === currentLang ? ' selected' : ''}" data-lang="${lang}">${LANG_NAMES[lang]}</button>`).join('')}
  </div>`;

const wireKioskLangs = (onChange) => {
  $$('.kiosk-lang').forEach((button) => {
    button.onclick = () => {
      kiosk.chosenLang = button.dataset.lang;
      setLang(button.dataset.lang);
      onChange();
    };
  });
};

const kioskShell = (html) => {
  renderHeader();
  $('#view').innerHTML = `<div class="kiosk">${html}</div>`;
};

const nowClock = () => new Date().toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const nowDate = () => {
  const text = new Date().toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// ── 1. Nombres ──────────────────────────────────────────────
const renderKioskNames = async () => {
  stopKioskTimers();
  kioskShell(`<p class="muted">${tr('loading')}</p>`);
  const workers = await kioskRun(() => kioskApi('GET', '/terminal/workers'));
  if (!workers) return;
  kioskShell(`
    <div class="kiosk-clock"><div id="kiosk-time">${nowClock()}</div><div class="muted" id="kiosk-date">${nowDate()}</div></div>
    ${kioskLangButtons()}
    <h2 class="kiosk-title">${tr('kiosk_tap_name')}</h2>
    ${workers.length ? `<div class="kiosk-names">${workers.map((w) => `
      <button type="button" class="kiosk-name" data-id="${w.id}">
        ${w.clocked_in ? '<span class="dot" aria-hidden="true"></span>' : ''}
        <strong>${esc(w.full_name)}</strong><span class="muted">${esc(w.company_code)}</span>
      </button>`).join('')}</div>` : `<p class="badge badge-amber kiosk-empty">${tr('kiosk_no_workers')}</p>`}
    <button type="button" class="kiosk-admin-link" id="kiosk-admin">⚙ ${tr('kiosk_admin')} · ${esc(kiosk.terminal.name)}</button>`);

  wireKioskLangs(renderKioskNames);
  $$('.kiosk-name').forEach((button) => {
    button.onclick = () => renderKioskPin(workers.find((w) => w.id === Number(button.dataset.id)));
  });
  $('#kiosk-admin').onclick = renderKioskAdmin;
  kiosk.clockTimer = setInterval(() => {
    $('#kiosk-time').textContent = nowClock();
    $('#kiosk-date').textContent = nowDate();
  }, 1000);
  // La lista se refresca sola para reflejar altas, bajas y quién está fichado.
  clearTimeout(kiosk.idleTimer);
  kiosk.idleTimer = setTimeout(renderKioskNames, 60000);
};

// ── 2. PIN ──────────────────────────────────────────────────
const renderKioskPin = (worker) => {
  stopKioskTimers();
  kiosk.worker = worker;
  kiosk.pin = '';
  if (!kiosk.chosenLang) setLang(worker.lang);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'clear'];
  kioskShell(`
    <h2 class="kiosk-title">${esc(worker.full_name)}</h2>
    <p class="kiosk-subtitle">${tr('kiosk_enter_pin')}</p>
    <div class="pin-dots" id="pin-dots"></div>
    <div class="keypad">${keys.map((key) => `<button type="button" class="key" data-key="${key}">${
      { back: '⌫', clear: '✕' }[key] || key}</button>`).join('')}</div>
    <button type="button" class="btn btn-huge kiosk-cancel" id="kiosk-cancel">${tr('back')}</button>`);

  const showDots = () => {
    $('#pin-dots').innerHTML = Array.from({ length: PIN_LENGTH }, (_, i) => `<span class="${i < kiosk.pin.length ? 'filled' : ''}"></span>`).join('');
  };
  const press = (key) => {
    armIdle();
    if (key === 'back') kiosk.pin = kiosk.pin.slice(0, -1);
    else if (key === 'clear') kiosk.pin = '';
    else if (kiosk.pin.length < PIN_LENGTH) kiosk.pin += key;
    showDots();
    if (kiosk.pin.length === PIN_LENGTH) submitPin();
  };
  const submitPin = () => kioskRun(async () => {
    const pin = kiosk.pin;
    kiosk.pin = '';
    let result;
    try {
      result = await kioskApi('POST', '/terminal/login', { user_id: worker.id, pin });
    } catch (err) {
      showDots();
      throw err;
    }
    kiosk.session = result.token;
    await renderKioskWorker();
  });

  showDots();
  $$('.key').forEach((button) => { button.onclick = () => press(button.dataset.key); });
  document.onkeydown = (event) => {
    if (!$('.keypad')) { document.onkeydown = null; return; }
    if (/^\d$/.test(event.key)) press(event.key);
    else if (event.key === 'Backspace') press('back');
    else if (event.key === 'Escape') endKioskSession();
  };
  $('#kiosk-cancel').onclick = endKioskSession;
  armIdle();
};

// ── 3. Fichar ───────────────────────────────────────────────
const renderKioskWorker = async () => {
  document.onkeydown = null;
  stopKioskTimers();
  const [{ open }, workOrders] = await Promise.all([
    kioskApi('GET', '/my/status', undefined, kiosk.session),
    kioskApi('GET', '/my/work-orders', undefined, kiosk.session),
  ]);
  const cancel = `<button type="button" class="btn btn-huge kiosk-cancel" id="kiosk-cancel">${tr('back')}</button>`;

  if (open) {
    kioskShell(`
      <h2 class="kiosk-title">${esc(kiosk.worker.full_name)}</h2>
      <section class="card status-card working">
        <div class="muted">${tr('working_on')}</div>
        <div class="ot-big">${esc(open.ot_number)}</div>
        <div>${esc(open.ot_description)}</div>
        <div><span class="badge">${open.place === 'workshop' ? '🔧' : '⚓'} ${placeLabel(open.place)}</span></div>
        <div class="muted">${tr('since')} ${fmtDateTime(open.start_at)}</div>
        <div class="timer" id="timer">${fmtClock(Date.now() - Date.parse(open.start_at))}</div>
        <button type="button" class="btn btn-out btn-huge" id="kiosk-out">⏹ ${tr('clock_out')}</button>
      </section>
      ${cancel}`);
    kiosk.clockTimer = setInterval(() => { $('#timer').textContent = fmtClock(Date.now() - Date.parse(open.start_at)); }, 1000);
    $('#kiosk-out').onclick = () => kioskRun(async () => {
      $('#kiosk-out').disabled = true;
      const entry = await kioskApi('POST', '/my/clock-out', {}, kiosk.session);
      renderKioskDone('kiosk_done_out', entry.end_at, entry);
    });
  } else {
    kioskShell(`
      <h2 class="kiosk-title">${esc(kiosk.worker.full_name)}</h2>
      <section class="card">
        <h3>${tr('select_ot')}</h3>
        <div class="ot-list">${workOrders.map((w) => `
          <button type="button" class="ot-option" data-ot="${w.id}">
            <strong>${esc(w.ot_number)}</strong>${esc(w.description)}
            ${w.vessel ? `<div class="muted">${esc(w.vessel)}</div>` : ''}
          </button>`).join('')}</div>
        <h3 style="margin-top:16px">${tr('choose_place')}</h3>
        <div class="place-choice">
          <button type="button" class="ot-option place-option" data-place="board">⚓ <strong>${tr('place_board')}</strong></button>
          <button type="button" class="ot-option place-option" data-place="workshop">🔧 <strong>${tr('place_workshop')}</strong></button>
        </div>
        <button type="button" class="btn btn-in btn-huge" id="kiosk-in" style="margin-top:16px" disabled>▶ ${tr('clock_in')}</button>
      </section>
      ${cancel}`);
    let orderId = workOrders.length === 1 ? workOrders[0].id : null;
    let place = null;
    const refresh = () => {
      $$('.ot-option[data-ot]').forEach((b) => b.classList.toggle('selected', Number(b.dataset.ot) === orderId));
      $$('.place-option').forEach((b) => b.classList.toggle('selected', b.dataset.place === place));
      $('#kiosk-in').disabled = !(orderId && place);
    };
    $$('.ot-option[data-ot]').forEach((b) => { b.onclick = () => { orderId = Number(b.dataset.ot); armIdle(); refresh(); }; });
    $$('.place-option').forEach((b) => { b.onclick = () => { place = b.dataset.place; armIdle(); refresh(); }; });
    refresh();
    $('#kiosk-in').onclick = () => kioskRun(async () => {
      $('#kiosk-in').disabled = true;
      const entry = await kioskApi('POST', '/my/clock-in', { work_order_id: orderId, place }, kiosk.session);
      renderKioskDone('kiosk_done_in', entry.start_at, entry);
    });
  }
  $('#kiosk-cancel').onclick = endKioskSession;
  armIdle();
};

// ── 4. Confirmación ─────────────────────────────────────────
const renderKioskDone = (messageKey, at, entry) => {
  stopKioskTimers();
  kioskShell(`
    <section class="card kiosk-done ${messageKey === 'kiosk_done_in' ? 'in' : 'out'}">
      <div class="kiosk-check">✓</div>
      <h2>${tr(messageKey)}</h2>
      <div class="kiosk-done-time">${fmtTime(at)}</div>
      <p><strong>${esc(kiosk.worker.full_name)}</strong></p>
      <p class="muted">${esc(entry.ot_number)} · ${esc(entry.ot_description)} · ${placeLabel(entry.place)}</p>
    </section>`);
  armIdle(KIOSK_DONE_MS);
};

// ── Administración del terminal ─────────────────────────────
const adminLoginFields = () => `
  <div class="field"><label>${tr('username')}</label><input name="username" autocomplete="off" autocapitalize="none" required></div>
  <div class="field"><label>${tr('password')}</label><input name="password" type="password" autocomplete="off" required></div>`;

// Inicia sesión de administrador solo para esta operación y la cierra al acabar.
const withAdminSession = async (username, password, work) => {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new KioskFailure(data.error);
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${data.token}` };
  try {
    if (data.user.role !== 'admin') throw new KioskFailure('forbidden');
    return await work(headers);
  } finally {
    fetch('/api/logout', { method: 'POST', headers }).catch(() => {});
  }
};

const adminRequest = async (headers, method, path, body) => {
  const res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new KioskFailure(data.error);
  return data;
};

const renderKioskAdmin = () => {
  stopKioskTimers();
  kioskShell(`
    <form class="card login" id="kiosk-admin-form">
      <h2>⚙ ${tr('kiosk_admin')}</h2>
      <p class="muted" style="margin-bottom:12px">${esc(kiosk.terminal.name)}</p>
      ${adminLoginFields()}
      <button class="btn btn-danger btn-huge">${tr('exit_terminal')}</button>
      <button type="button" class="btn btn-huge" id="kiosk-admin-back" style="margin-top:10px">${tr('back')}</button>
    </form>`);
  $('#kiosk-admin-back').onclick = endKioskSession;
  $('#kiosk-admin-form').onsubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    kioskRun(async () => {
      await withAdminSession(data.get('username'), data.get('password'), (headers) => adminRequest(headers, 'DELETE', `/terminals/${kiosk.terminal.id}`));
      forgetTerminal();
      render();
    });
  };
  armIdle();
};

// Configuración inicial desde la primera pantalla (la hace un administrador una sola vez).
const renderTerminalSetup = () => {
  $('#view').innerHTML = `
    <form class="card login" id="terminal-setup-form">
      <h2>🖥️ ${tr('terminal_setup')}</h2>
      <p class="muted" style="margin-bottom:12px">${tr('terminal_setup_help')}</p>
      ${adminLoginFields()}
      <div class="field"><label>${tr('terminal_name')}</label><input name="name" required placeholder="${tr('terminal_name_placeholder')}"></div>
      <button class="btn btn-primary btn-huge">${tr('configure')}</button>
      <button type="button" class="btn btn-huge" id="setup-back" style="margin-top:10px">${tr('back')}</button>
    </form>`;
  $('#setup-back').onclick = render;
  $('#terminal-setup-form').onsubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    kioskRun(async () => {
      const terminal = await withAdminSession(data.get('username'), data.get('password'),
        (headers) => adminRequest(headers, 'POST', '/terminals', { name: data.get('name') }));
      activateTerminal(terminal);
    });
  };
};

const activateTerminal = (terminal) => {
  saveTerminal({ id: terminal.id, name: terminal.name, token: terminal.token, lang: currentLang });
  storage.set(DEVICE_KEY, 'terminal');
  render();
};

const renderKiosk = () => {
  kiosk.terminal = loadTerminal();
  endKioskSession();
};
