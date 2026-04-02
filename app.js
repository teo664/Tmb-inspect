// TMB Inspect — Main App Logic

// ── STATE ─────────────────────────────────────────────────────
let currentScreen = 0;
let currentInspection = null;
let savedInspections = [];
const STORAGE_KEY = 'tmb_inspections';

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadSavedInspections();
  buildChecklistUI();
  renderHomeScreen();
  showScreen(0);

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Wire up events
  document.getElementById('btn-new').addEventListener('click', startNewInspection);
  document.getElementById('photo-input').addEventListener('change', handlePhotoAdd);
  document.getElementById('btn-add-photo').addEventListener('click', () => {
    document.getElementById('photo-input').click();
  });
  document.getElementById('btn-add-material').addEventListener('click', addMaterialRow);
  document.getElementById('btn-generate-pdf').addEventListener('click', handleGeneratePDF);
  document.getElementById('btn-share').addEventListener('click', handleShare);

  // Step pills click
  document.querySelectorAll('.step-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const step = parseInt(pill.dataset.step);
      if (currentInspection && step > 0) navigateTo(step);
    });
  });

  // Nav buttons
  document.getElementById('btn-prev-vessel').addEventListener('click', () => navigateTo(0));
  document.getElementById('btn-next-vessel').addEventListener('click', () => {
    if (validateVesselForm()) { saveVesselForm(); navigateTo(2); }
  });
  document.getElementById('btn-prev-check').addEventListener('click', () => navigateTo(1));
  document.getElementById('btn-next-check').addEventListener('click', () => navigateTo(3));
  document.getElementById('btn-prev-photos').addEventListener('click', () => navigateTo(2));
  document.getElementById('btn-next-photos').addEventListener('click', () => navigateTo(4));
  document.getElementById('btn-prev-materials').addEventListener('click', () => navigateTo(3));
  document.getElementById('btn-next-materials').addEventListener('click', () => { saveMaterials(); navigateTo(5); });
  document.getElementById('btn-prev-report').addEventListener('click', () => navigateTo(4));
});

// ── STORAGE ───────────────────────────────────────────────────
function loadSavedInspections() {
  try {
    savedInspections = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { savedInspections = []; }
}

function saveInspection() {
  if (!currentInspection) return;
  const idx = savedInspections.findIndex(i => i.id === currentInspection.id);
  if (idx >= 0) savedInspections[idx] = currentInspection;
  else savedInspections.unshift(currentInspection);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInspections));
}

function deleteInspection(id) {
  savedInspections = savedInspections.filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInspections));
  renderHomeScreen();
  showToast('Inspección eliminada');
}

// ── NAVIGATION ────────────────────────────────────────────────
function showScreen(n) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${n}`).classList.add('active');
  currentScreen = n;
  updateStepPills();
  updateVesselLabel();
  window.scrollTo(0, 0);

  if (n === 5) renderReportPreview();
}

function navigateTo(n) {
  if (n === 2) renderChecklist();
  if (n === 3) renderPhotoGrid();
  if (n === 4) renderMaterialsForm();
  showScreen(n);
  saveInspection();
}

function updateStepPills() {
  document.querySelectorAll('.step-pill').forEach(pill => {
    const step = parseInt(pill.dataset.step);
    pill.classList.remove('active', 'done');
    if (!currentInspection) return;
    if (step === currentScreen) pill.classList.add('active');
    else if (step < currentScreen) pill.classList.add('done');
  });
}

function updateVesselLabel() {
  const el = document.getElementById('vessel-label');
  if (!currentInspection || !currentInspection.vessel.name) {
    el.innerHTML = '<span>Sin buque</span>';
  } else {
    el.innerHTML = `<strong>${currentInspection.vessel.name}</strong>${currentInspection.vessel.port ? currentInspection.vessel.port : ''}`;
  }
}

// ── HOME SCREEN ───────────────────────────────────────────────
function renderHomeScreen() {
  const list = document.getElementById('saved-list');
  if (savedInspections.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="es-icon">📋</div><p>No hay inspecciones guardadas</p></div>';
    return;
  }
  list.innerHTML = savedInspections.map(ins => {
    const date = ins.vessel?.date ? new Date(ins.vessel.date + 'T12:00:00').toLocaleDateString('es-ES') : '—';
    const noCount = Object.values(ins.checklist || {}).filter(v => v === 'no').length;
    return `
      <div class="inspection-card" onclick="loadInspection('${ins.id}')">
        <div class="ic-info">
          <div class="ic-name">M/V ${ins.vessel?.name || 'Sin nombre'}</div>
          <div class="ic-meta">${date} · ${ins.vessel?.port || '—'} ${noCount > 0 ? `· <span style="color:#C8102E;font-weight:600">${noCount} deficiencias</span>` : ''}</div>
        </div>
        <button class="ic-delete" onclick="event.stopPropagation();deleteInspection('${ins.id}')">🗑</button>
        <span class="ic-arrow">›</span>
      </div>
    `;
  }).join('');
}

function startNewInspection() {
  currentInspection = {
    id: Date.now().toString(),
    vessel: {},
    checklist: {},
    photos: [],
    materials: [],
    notes: '',
    createdAt: new Date().toISOString(),
  };
  // Set today's date
  document.getElementById('v-date').value = new Date().toISOString().split('T')[0];
  clearVesselForm();
  navigateTo(1);
}

function loadInspection(id) {
  currentInspection = savedInspections.find(i => i.id === id);
  if (!currentInspection) return;
  fillVesselForm();
  navigateTo(1);
}

// ── VESSEL FORM ───────────────────────────────────────────────
function clearVesselForm() {
  ['v-name','v-flag','v-imo','v-type','v-port','v-inspector','v-jobref','v-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('v-date').value = new Date().toISOString().split('T')[0];
}

function fillVesselForm() {
  const v = currentInspection.vessel;
  if (v.name)      document.getElementById('v-name').value = v.name;
  if (v.flag)      document.getElementById('v-flag').value = v.flag;
  if (v.imo)       document.getElementById('v-imo').value = v.imo;
  if (v.type)      document.getElementById('v-type').value = v.type;
  if (v.port)      document.getElementById('v-port').value = v.port;
  if (v.inspector) document.getElementById('v-inspector').value = v.inspector;
  if (v.jobRef)    document.getElementById('v-jobref').value = v.jobRef;
  if (v.date)      document.getElementById('v-date').value = v.date;
}

function saveVesselForm() {
  currentInspection.vessel = {
    name:      document.getElementById('v-name').value.trim(),
    flag:      document.getElementById('v-flag').value.trim(),
    imo:       document.getElementById('v-imo').value.trim(),
    type:      document.getElementById('v-type').value.trim(),
    port:      document.getElementById('v-port').value.trim(),
    inspector: document.getElementById('v-inspector').value.trim(),
    jobRef:    document.getElementById('v-jobref').value.trim(),
    date:      document.getElementById('v-date').value,
  };
}

function validateVesselForm() {
  const name = document.getElementById('v-name').value.trim();
  const inspector = document.getElementById('v-inspector').value.trim();
  if (!name) { showToast('⚠ Introduce el nombre del buque'); document.getElementById('v-name').focus(); return false; }
  if (!inspector) { showToast('⚠ Introduce el nombre del inspector'); document.getElementById('v-inspector').focus(); return false; }
  return true;
}

// ── CHECKLIST ─────────────────────────────────────────────────
function buildChecklistUI() {
  const container = document.getElementById('checklist-container');
  container.innerHTML = CHECKLIST_DATA.map(cat => `
    <div class="category-block" id="cat-${cat.id}">
      <div class="category-header" onclick="toggleCategory('${cat.id}')">
        <div class="cat-left">
          <span class="cat-icon">${cat.icon}</span>
          <div>
            <div class="cat-title">${cat.title}</div>
            <div class="cat-count" id="count-${cat.id}">0 / ${cat.items.length} completados</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="cat-progress">
            <div class="cat-progress-bar"><div class="cat-progress-fill" id="prog-${cat.id}" style="width:0%"></div></div>
          </div>
          <span class="cat-arrow">▾</span>
        </div>
      </div>
      <div class="category-items" id="items-${cat.id}">
        ${cat.items.map(item => `
          <div class="check-item">
            <div class="check-item-text">${item.text}</div>
            <div class="check-btns">
              <button class="check-btn yes" id="btn-yes-${item.id}" onclick="setCheck('${cat.id}','${item.id}','yes')">SÍ</button>
              <button class="check-btn no"  id="btn-no-${item.id}"  onclick="setCheck('${cat.id}','${item.id}','no')">NO</button>
              <button class="check-btn na"  id="btn-na-${item.id}"  onclick="setCheck('${cat.id}','${item.id}','na')">N/A</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function renderChecklist() {
  if (!currentInspection) return;
  // Restore saved answers
  CHECKLIST_DATA.forEach(cat => {
    cat.items.forEach(item => {
      const val = currentInspection.checklist[item.id];
      ['yes','no','na'].forEach(v => {
        const btn = document.getElementById(`btn-${v}-${item.id}`);
        if (btn) btn.classList.toggle('active', val === v);
      });
    });
    updateCategoryProgress(cat.id);
  });
  updateChecklistSummary();
  // Open first incomplete category
  const firstIncomplete = CHECKLIST_DATA.find(cat =>
    cat.items.some(item => !currentInspection.checklist[item.id])
  );
  if (firstIncomplete) toggleCategory(firstIncomplete.id, true);
}

function setCheck(catId, itemId, val) {
  if (!currentInspection) return;
  const current = currentInspection.checklist[itemId];
  // Toggle off if same value clicked
  if (current === val) {
    delete currentInspection.checklist[itemId];
    val = null;
  } else {
    currentInspection.checklist[itemId] = val;
  }
  ['yes','no','na'].forEach(v => {
    const btn = document.getElementById(`btn-${v}-${itemId}`);
    if (btn) btn.classList.toggle('active', val === v);
  });
  updateCategoryProgress(catId);
  updateChecklistSummary();
}

function toggleCategory(id, forceOpen = false) {
  const block = document.getElementById(`cat-${id}`);
  if (!block) return;
  if (forceOpen) block.classList.add('open');
  else block.classList.toggle('open');
}

function updateCategoryProgress(catId) {
  const cat = CHECKLIST_DATA.find(c => c.id === catId);
  if (!cat) return;
  const answered = cat.items.filter(item => currentInspection.checklist[item.id]).length;
  const pct = Math.round(answered / cat.items.length * 100);
  const prog = document.getElementById(`prog-${catId}`);
  const count = document.getElementById(`count-${catId}`);
  if (prog) prog.style.width = pct + '%';
  if (count) count.textContent = `${answered} / ${cat.items.length} completados`;
}

function updateChecklistSummary() {
  let yes = 0, no = 0, na = 0;
  Object.values(currentInspection.checklist).forEach(v => {
    if (v === 'yes') yes++;
    else if (v === 'no') no++;
    else if (v === 'na') na++;
  });
  document.getElementById('sum-yes').textContent = yes;
  document.getElementById('sum-no').textContent = no;
  document.getElementById('sum-na').textContent = na;
}

// ── PHOTOS ────────────────────────────────────────────────────
function handlePhotoAdd(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      currentInspection.photos.push({
        id: Date.now().toString() + Math.random(),
        dataUrl: ev.target.result,
        caption: '',
      });
      renderPhotoGrid();
      saveInspection();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function renderPhotoGrid() {
  if (!currentInspection) return;
  const grid = document.getElementById('photo-grid');
  const photos = currentInspection.photos;

  document.getElementById('photo-count').textContent =
    photos.length === 0 ? 'Sin fotos' : `${photos.length} foto${photos.length !== 1 ? 's' : ''}`;

  if (photos.length === 0) {
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = photos.map((p, i) => `
    <div class="photo-card">
      <img src="${p.dataUrl}" alt="Photo ${i+1}">
      <button class="photo-delete" onclick="deletePhoto('${p.id}')">✕</button>
      <div class="photo-card-footer">
        <input type="text" placeholder="Descripción..." value="${p.caption || ''}"
          onchange="updatePhotoCaption('${p.id}', this.value)">
      </div>
    </div>
  `).join('');
}

function deletePhoto(id) {
  currentInspection.photos = currentInspection.photos.filter(p => p.id !== id);
  renderPhotoGrid();
  saveInspection();
}

function updatePhotoCaption(id, caption) {
  const photo = currentInspection.photos.find(p => p.id === id);
  if (photo) { photo.caption = caption; saveInspection(); }
}

// ── MATERIALS ─────────────────────────────────────────────────
const UNITS = ['ud', 'ml', 'l', 'kg', 't', 'm', 'm²', 'm³', 'h', 'set', 'par'];

function renderMaterialsForm() {
  if (!currentInspection) return;
  const container = document.getElementById('materials-list');
  if (currentInspection.materials.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="es-icon">📦</div><p>No hay materiales. Pulsa "Añadir" para agregar.</p></div>';
    return;
  }
  container.innerHTML = currentInspection.materials.map((m, i) => `
    <div class="material-row" id="mat-row-${m.id}">
      <input type="text" placeholder="Descripción del material..." value="${m.description || ''}"
        onchange="updateMaterial('${m.id}','description',this.value)">
      <input type="number" placeholder="Cant." value="${m.quantity || ''}" min="0"
        onchange="updateMaterial('${m.id}','quantity',this.value)">
      <select onchange="updateMaterial('${m.id}','unit',this.value)">
        ${UNITS.map(u => `<option value="${u}" ${m.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
      </select>
      <button class="mat-delete" onclick="deleteMaterial('${m.id}')">🗑</button>
    </div>
  `).join('');
}

function addMaterialRow() {
  if (!currentInspection) return;
  const mat = { id: Date.now().toString(), description: '', quantity: '', unit: 'ud' };
  currentInspection.materials.push(mat);
  renderMaterialsForm();
  // Focus the new row's description
  setTimeout(() => {
    const lastRow = document.querySelector(`#mat-row-${mat.id} input`);
    if (lastRow) lastRow.focus();
  }, 50);
}

function deleteMaterial(id) {
  currentInspection.materials = currentInspection.materials.filter(m => m.id !== id);
  renderMaterialsForm();
}

function updateMaterial(id, field, value) {
  const mat = currentInspection.materials.find(m => m.id === id);
  if (mat) mat[field] = value;
}

function saveMaterials() {
  // Materials are saved in real-time via updateMaterial, but sync from DOM
  document.querySelectorAll('.material-row').forEach(row => {
    const id = row.id.replace('mat-row-', '');
    const mat = currentInspection.materials.find(m => m.id === id);
    if (mat) {
      const inputs = row.querySelectorAll('input, select');
      if (inputs[0]) mat.description = inputs[0].value;
      if (inputs[1]) mat.quantity = inputs[1].value;
      if (inputs[2]) mat.unit = inputs[2].value;
    }
  });
}

// ── REPORT PREVIEW ────────────────────────────────────────────
function renderReportPreview() {
  if (!currentInspection) return;
  let yes = 0, no = 0, na = 0;
  Object.values(currentInspection.checklist).forEach(v => {
    if (v === 'yes') yes++;
    else if (v === 'no') no++;
    else if (v === 'na') na++;
  });
  document.getElementById('rp-yes').textContent = yes;
  document.getElementById('rp-no').textContent = no;
  document.getElementById('rp-photos').textContent = currentInspection.photos.length;
  document.getElementById('rp-materials').textContent = currentInspection.materials.length;
  document.getElementById('report-notes').value = currentInspection.notes || '';
}

// ── PDF GENERATION ────────────────────────────────────────────
async function handleGeneratePDF() {
  if (!currentInspection) return;
  currentInspection.notes = document.getElementById('report-notes').value;
  saveInspection();

  showLoading('Generando informe PDF...');
  try {
    const doc = await generatePDF(currentInspection);
    const fileName = `TMB_Inspect_${(currentInspection.vessel.name || 'vessel').replace(/\s+/g, '_')}_${currentInspection.vessel.date || new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    document.getElementById('btn-share').style.display = 'flex';
    showToast('✅ PDF generado correctamente');
    // Store for sharing
    window._lastPdfDoc = doc;
    window._lastPdfName = fileName;
  } catch (err) {
    console.error(err);
    showToast('❌ Error al generar el PDF');
  } finally {
    hideLoading();
  }
}

async function handleShare() {
  if (!window._lastPdfDoc) return;
  try {
    const pdfBlob = window._lastPdfDoc.output('blob');
    const file = new File([pdfBlob], window._lastPdfName, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `TMB Inspect — ${currentInspection.vessel.name || 'Inspection Report'}` });
    } else {
      // Fallback: download again
      window._lastPdfDoc.save(window._lastPdfName);
    }
  } catch (err) {
    if (err.name !== 'AbortError') showToast('Error al compartir');
  }
}

// ── UTILITIES ─────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function showLoading(msg = 'Cargando...') {
  document.getElementById('loading').classList.add('show');
  document.getElementById('loading-msg').textContent = msg;
}

function hideLoading() {
  document.getElementById('loading').classList.remove('show');
}
