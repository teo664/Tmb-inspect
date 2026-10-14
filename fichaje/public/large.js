// TMB Fichaje — vista «pantalla grande» para los ordenadores táctiles de la empresa.
// El operario la elige al iniciar sesión. Como el ordenador es compartido, la sesión no se guarda
// en el equipo y se cierra sola al fichar o tras un rato sin tocar la pantalla.

const LARGE_IDLE_MS = 60000;
const LARGE_DONE_MS = 4000;

const large = { idleTimer: null, clockTimer: null };

const stopLargeTimers = () => {
  clearTimeout(large.idleTimer);
  clearInterval(large.clockTimer);
};

const armLargeIdle = (ms = LARGE_IDLE_MS) => {
  clearTimeout(large.idleTimer);
  large.idleTimer = setTimeout(signOut, ms);
};

// Cualquier toque o tecla en la vista grande reinicia la cuenta atrás de inactividad.
const keepLargeAlive = () => {
  if (state.mode === 'large' && state.user?.role === 'worker' && !$('.large-done')) armLargeIdle();
};

const largeClock = () => new Date().toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });

const largeLogoutButton = () => `<button type="button" class="btn btn-huge large-exit" id="large-exit">${tr('logout')}</button>`;

const renderLargeWorker = async () => {
  stopLargeTimers();
  const [{ open }, workOrders] = await Promise.all([api('GET', '/my/status'), api('GET', '/my/work-orders')]);
  const head = `
    <div class="large-head">
      <div class="large-clock" id="large-clock">${largeClock()}</div>
      <h2>${esc(state.user.full_name)}</h2>
    </div>`;

  if (open) {
    $('#view').innerHTML = `<div class="large">${head}
      <section class="card status-card working">
        <div class="muted">${tr('working_on')}</div>
        <div class="ot-big">${esc(open.ot_number)}</div>
        <div>${esc(open.ot_description)}</div>
        <div><span class="badge">${open.place === 'workshop' ? '🔧' : '⚓'} ${placeLabel(open.place)}</span></div>
        <div class="muted">${tr('since')} ${fmtDateTime(open.start_at)}</div>
        <div class="timer" id="timer">${fmtClock(Date.now() - Date.parse(open.start_at))}</div>
        <button type="button" class="btn btn-out btn-huge" id="large-out">⏹ ${tr('clock_out')}</button>
      </section>
      ${largeLogoutButton()}</div>`;
    $('#large-out').onclick = () => run(async () => {
      $('#large-out').disabled = true;
      const entry = await api('POST', '/my/clock-out', {});
      renderLargeDone('done_out', entry.end_at, entry);
    });
  } else {
    $('#view').innerHTML = `<div class="large">${head}
      <section class="card">
        ${workOrders.length ? `
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
          <button type="button" class="btn btn-in btn-huge" id="large-in" style="margin-top:16px" disabled>▶ ${tr('clock_in')}</button>`
        : `<p class="badge badge-amber" style="padding:12px 14px">${tr('no_assigned_ots')}</p>`}
      </section>
      ${largeLogoutButton()}</div>`;
    let orderId = workOrders.length === 1 ? workOrders[0].id : null;
    let place = null;
    const refresh = () => {
      $$('.ot-option[data-ot]').forEach((b) => b.classList.toggle('selected', Number(b.dataset.ot) === orderId));
      $$('.place-option').forEach((b) => b.classList.toggle('selected', b.dataset.place === place));
      const button = $('#large-in');
      if (button) button.disabled = !(orderId && place);
    };
    $$('.ot-option[data-ot]').forEach((b) => { b.onclick = () => { orderId = Number(b.dataset.ot); refresh(); }; });
    $$('.place-option').forEach((b) => { b.onclick = () => { place = b.dataset.place; refresh(); }; });
    refresh();
    const clockIn = $('#large-in');
    if (clockIn) {
      clockIn.onclick = () => run(async () => {
        clockIn.disabled = true;
        const entry = await api('POST', '/my/clock-in', { work_order_id: orderId, place });
        renderLargeDone('done_in', entry.start_at, entry);
      });
    }
  }

  $('#large-exit').onclick = signOut;
  large.clockTimer = setInterval(() => {
    $('#large-clock').textContent = largeClock();
    const timer = $('#timer');
    if (timer && open) timer.textContent = fmtClock(Date.now() - Date.parse(open.start_at));
  }, 1000);
  armLargeIdle();
};

const renderLargeDone = (messageKey, at, entry) => {
  stopLargeTimers();
  $('#view').innerHTML = `<div class="large">
    <section class="card large-done ${messageKey === 'done_in' ? 'in' : 'out'}">
      <div class="large-check">✓</div>
      <h2>${tr(messageKey)}</h2>
      <div class="large-done-time">${fmtTime(at)}</div>
      <p><strong>${esc(state.user.full_name)}</strong></p>
      <p class="muted">${esc(entry.ot_number)} · ${esc(entry.ot_description)} · ${placeLabel(entry.place)}</p>
      <p class="muted" style="margin-top:12px">${tr('auto_logout')}</p>
    </section></div>`;
  armLargeIdle(LARGE_DONE_MS);
};
