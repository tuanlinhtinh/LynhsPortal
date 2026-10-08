// =========================================
//  SubTrack — App Logic
// =========================================

const STORAGE_KEY = 'subtrack_v1';

const categoryEmoji = {
  streaming: '🎬',
  music:     '🎵',
  software:  '💻',
  gaming:    '🎮',
  news:      '📰',
  cloud:     '☁️',
  other:     '◈',
};

// ---- State ----
let services = loadServices();
let editingId = null;

// ---- DOM refs ----
const cardsGrid      = document.getElementById('cardsGrid');
const emptyState     = document.getElementById('emptyState');
const totalCountEl   = document.getElementById('totalCount');
const dueSoonCountEl = document.getElementById('dueSoonCount');
const modalOverlay   = document.getElementById('modalOverlay');
const modalTitle     = document.getElementById('modalTitle');
const openModalBtn   = document.getElementById('openModal');
const closeModalBtn  = document.getElementById('closeModal');
const submitBtn      = document.getElementById('submitBtn');
const formError      = document.getElementById('formError');

const inputName     = document.getElementById('inputName');
const inputStart    = document.getElementById('inputStart');
const inputEnd      = document.getElementById('inputEnd');
const inputCategory = document.getElementById('inputCategory');
const inputCost     = document.getElementById('inputCost');
const inputBilling  = document.getElementById('inputBilling');

const summaryPanel      = document.getElementById('summaryPanel');
const sumMonthlyEl      = document.getElementById('sumMonthly');
const sumYearlyEl       = document.getElementById('sumYearly');
const sumMonthlyBreakEl = document.getElementById('sumMonthlyBreak');
const sumYearlyBreakEl  = document.getElementById('sumYearlyBreak');
const summaryNoteEl     = document.getElementById('summaryNote');

// ---- Storage ----
function loadServices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : getSampleData();
  } catch { return getSampleData(); }
}

function saveServices() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
}

function getSampleData() {
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const add = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  return [
    { id: uid(), name: 'Netflix',    category: 'streaming', start: fmt(add(today, -20)), end: fmt(add(today, 10)),  cost: 15.49, billing: 'monthly' },
    { id: uid(), name: 'Spotify',    category: 'music',     start: fmt(add(today, -5)),  end: fmt(add(today, 25)),  cost: 9.99,  billing: 'monthly' },
    { id: uid(), name: 'GitHub',     category: 'software',  start: fmt(add(today, -60)), end: fmt(add(today, 3)),   cost: 4.00,  billing: 'monthly' },
    { id: uid(), name: 'Google One', category: 'cloud',     start: fmt(add(today, -10)), end: fmt(add(today, 50)),  cost: 29.99, billing: 'yearly'  },
  ];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---- Date helpers ----
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmtDate(str) {
  const d = parseDate(str);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysRemaining(endStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = parseDate(endStr);
  return Math.ceil((end - now) / 86400000);
}

function totalDays(startStr, endStr) {
  const s = parseDate(startStr);
  const e = parseDate(endStr);
  return Math.max(1, Math.ceil((e - s) / 86400000));
}

function elapsedDays(startStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const s = parseDate(startStr);
  return Math.max(0, Math.ceil((now - s) / 86400000));
}

function getStatus(remaining) {
  if (remaining <= 3)  return 'urgent';
  if (remaining <= 10) return 'warn';
  return 'ok';
}

function getStatusLabel(remaining) {
  if (remaining < 0)   return 'OVERDUE';
  if (remaining === 0) return 'TODAY';
  if (remaining === 1) return 'TOMORROW';
  if (remaining <= 3)  return 'URGENT';
  if (remaining <= 10) return 'SOON';
  return 'ON TRACK';
}

// ---- Cost Summary ----
function fmtMoney(n) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function calcSummary() {
  const priced = services.filter(s => s.cost > 0 && s.billing !== 'none');
  if (priced.length === 0) {
    summaryPanel.style.display = 'none';
    return;
  }
  summaryPanel.style.display = 'block';

  const monthly = priced.filter(s => s.billing === 'monthly');
  const yearly  = priced.filter(s => s.billing === 'yearly');

  const monthlyTotal  = monthly.reduce((a, s) => a + s.cost, 0);
  const yearlyMonthly = yearly.reduce((a, s) => a + s.cost / 12, 0);
  const totalMonthly  = monthlyTotal + yearlyMonthly;

  const yearlyTotal    = yearly.reduce((a, s) => a + s.cost, 0);
  const monthlyYearly  = monthlyTotal * 12;
  const totalYearly    = monthlyYearly + yearlyTotal;

  sumMonthlyEl.textContent = fmtMoney(totalMonthly);
  sumYearlyEl.textContent  = fmtMoney(totalYearly);

  // Breakdown lines
  const mbLines = [];
  if (monthly.length) mbLines.push(`${monthly.length} monthly (${fmtMoney(monthlyTotal)})`);
  if (yearly.length)  mbLines.push(`${yearly.length} yearly ÷12 (${fmtMoney(yearlyMonthly)})`);
  sumMonthlyBreakEl.textContent = mbLines.join(' + ');

  const ybLines = [];
  if (monthly.length) ybLines.push(`${monthly.length} monthly ×12 (${fmtMoney(monthlyYearly)})`);
  if (yearly.length)  ybLines.push(`${yearly.length} yearly (${fmtMoney(yearlyTotal)})`);
  sumYearlyBreakEl.textContent = ybLines.join(' + ');

  const unpricedCount = services.length - priced.length;
  summaryNoteEl.textContent = unpricedCount > 0 ? `(${unpricedCount} service${unpricedCount > 1 ? 's' : ''} without price excluded)` : '';
}

// ---- Render ----
function render() {
  calcSummary();

  // Sort: soonest payment first
  const sorted = [...services].sort((a, b) => daysRemaining(a.end) - daysRemaining(b.end));

  totalCountEl.textContent   = services.length;
  dueSoonCountEl.textContent = services.filter(s => daysRemaining(s.end) <= 7).length;

  emptyState.style.display = services.length === 0 ? 'flex' : 'none';
  cardsGrid.innerHTML = '';

  sorted.forEach((svc, i) => {
    const remaining = daysRemaining(svc.end);
    const status    = getStatus(remaining);
    const total     = totalDays(svc.start, svc.end);
    const elapsed   = elapsedDays(svc.start);
    const pct       = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));

    const card = document.createElement('div');
    card.className = `card status-${status}`;
    card.style.animationDelay = `${i * 0.05}s`;

    const daysLabel = remaining < 0
      ? `${Math.abs(remaining)} days overdue`
      : remaining === 0
        ? 'Due today'
        : `${remaining} day${remaining !== 1 ? 's' : ''} remaining`;

    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="card-name">${escHtml(svc.name)}</div>
          <div class="card-category">${categoryEmoji[svc.category] || '◈'} ${capitalize(svc.category)}</div>
        </div>
        <div class="card-actions">
          <button class="card-btn edit"   data-id="${svc.id}" title="Edit">✎</button>
          <button class="card-btn delete" data-id="${svc.id}" title="Delete">✕</button>
        </div>
      </div>

      <div class="progress-wrap">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-labels">
          <span>${pct}% elapsed</span>
          <span>${total} days total</span>
        </div>
      </div>

      <div class="countdown-wrap">
        <div>
          <div class="countdown-days">${remaining < 0 ? '−' + Math.abs(remaining) : remaining}</div>
          <div class="countdown-label">${daysLabel}</div>
        </div>
        <div class="countdown-badge">${getStatusLabel(remaining)}</div>
      </div>

      <div class="dates-row">
        <div class="date-item">
          <span class="date-lbl">Start</span>
          <span class="date-val">${fmtDate(svc.start)}</span>
        </div>
        <span class="dates-arrow">→</span>
        <div class="date-item" style="text-align:right">
          <span class="date-lbl">Payment Due</span>
          <span class="date-val">${fmtDate(svc.end)}</span>
        </div>
        ${svc.cost > 0 ? `<span class="cost-tag">${fmtMoney(svc.cost)} / ${svc.billing === 'yearly' ? 'yr' : svc.billing === 'monthly' ? 'mo' : 'once'}</span>` : ''}
      </div>
    `;

    cardsGrid.appendChild(card);
  });

  // Bind card buttons
  document.querySelectorAll('.card-btn.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteService(btn.dataset.id));
  });
  document.querySelectorAll('.card-btn.edit').forEach(btn => {
    btn.addEventListener('click', () => openEdit(btn.dataset.id));
  });
}

// ---- Modal ----
function openAdd() {
  editingId = null;
  modalTitle.textContent = 'Add Service';
  submitBtn.textContent  = 'Save Service';
  inputName.value     = '';
  inputStart.value    = new Date().toISOString().split('T')[0];
  inputEnd.value      = '';
  inputCategory.value = 'streaming';
  inputCost.value     = '';
  inputBilling.value  = 'monthly';
  formError.textContent = '';
  modalOverlay.classList.add('open');
  inputName.focus();
}

function openEdit(id) {
  const svc = services.find(s => s.id === id);
  if (!svc) return;
  editingId = id;
  modalTitle.textContent = 'Edit Service';
  submitBtn.textContent  = 'Update Service';
  inputName.value     = svc.name;
  inputStart.value    = svc.start;
  inputEnd.value      = svc.end;
  inputCategory.value = svc.category;
  inputCost.value     = svc.cost > 0 ? svc.cost : '';
  inputBilling.value  = svc.billing || 'monthly';
  formError.textContent = '';
  modalOverlay.classList.add('open');
  inputName.focus();
}

function closeModal() {
  modalOverlay.classList.remove('open');
}

// ---- CRUD ----
function submitForm() {
  const name  = inputName.value.trim();
  const start = inputStart.value;
  const end   = inputEnd.value;

  if (!name)  { formError.textContent = 'Please enter a service name.'; return; }
  if (!start) { formError.textContent = 'Please select a start date.';  return; }
  if (!end)   { formError.textContent = 'Please select a payment due date.'; return; }
  if (end <= start) { formError.textContent = 'Payment date must be after start date.'; return; }

  formError.textContent = '';

  if (editingId) {
    const idx = services.findIndex(s => s.id === editingId);
    if (idx !== -1) {
      services[idx] = { ...services[idx], name, start, end, category: inputCategory.value, cost: parseFloat(inputCost.value) || 0, billing: inputBilling.value };
    }
  } else {
    services.push({
      id: uid(),
      name,
      start,
      end,
      category: inputCategory.value,
      cost: parseFloat(inputCost.value) || 0,
      billing: inputBilling.value,
    });
  }

  saveServices();
  render();
  closeModal();
}

function deleteService(id) {
  services = services.filter(s => s.id !== id);
  saveServices();
  render();
}

// ---- Helpers ----
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ---- Event listeners ----
openModalBtn.addEventListener('click', openAdd);
closeModalBtn.addEventListener('click', closeModal);
submitBtn.addEventListener('click', submitForm);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// ---- Live countdown refresh (every minute) ----
setInterval(render, 60000);

// ---- Init ----
render();
