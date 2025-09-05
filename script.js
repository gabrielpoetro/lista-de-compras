// app.js
'use strict';

// ====== Estado e persistência ======
const STORAGE_KEY = 'shopping.items.v1';
const PREFS_KEY = 'shopping.prefs.v1';

const state = {
  items: loadItems(),
  filter: {
    text: '',
    category: '',
    status: 'all', // all | pending | done | favorites
    sort: 'created_desc', // created_desc | created_asc | name_asc | name_desc | category_asc
  },
  ui: {
    editingId: null,
  },
};

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePrefs() {
  localStorage.setItem(PREFS_KEY, JSON.stringify({
    filter: state.filter,
  }));
}

// ====== Utilidades ======
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const uid = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

const now = () => new Date().toISOString();

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatQty(qty, unit) {
  return `${qty} ${unit}`;
}

function normalize(str) {
  return (str || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ====== Toasts ======
const toastsEl = $('#toasts');

function toast(msg, type = 'ok', timeout = 3000) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  toastsEl.appendChild(el);
  const t = setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 200);
  }, timeout);
  el.addEventListener('click', () => {
    clearTimeout(t);
    el.remove();
  });
}

// ====== Sugestões (histórico por frequência) ======
function buildSuggestionsPool() {
  const freq = new Map();
  for (const it of state.items) {
    const key = it.name.trim();
    if (!key) continue;
    freq.set(key, (freq.get(key) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

function getSuggestions(query, limit = 6) {
  const q = normalize(query);
  if (!q) return [];
  const pool = buildSuggestionsPool();
  return pool.filter(n => normalize(n).includes(q)).slice(0, limit);
}

// ====== DOM refs ======
const form = $('[data-js="add-form"]');
const nameInput = $('[data-js="name-input"]');
const qtyInput = $('[data-js="qty-input"]');
const unitInput = $('[data-js="unit-input"]');
const categoryInput = $('[data-js="category-input"]');
const recurringInput = $('[data-js="recurring-input"]');
const favoriteInput = $('[data-js="favorite-input"]');
const suggestionsEl = $('[data-js="suggestions"]');

const listEl = $('#items');
const itemTpl = $('#item-template');

const searchInput = $('[data-js="search"]');
const categoryFilter = $('[data-js="category-filter"]');
const filterPills = $$('[data-js="filter"]');
const sortSelect = $('[data-js="sort"]');

const statTotal = $('[data-js="stat-total"]');
const statPending = $('[data-js="stat-pending"]');
const statDone = $('[data-js="stat-done"]');
const statCats = $('[data-js="stat-cats"]');

const markAllBtn = $('#mark-all');
const clearDoneBtn = $('#clear-done');
const exportBtn = $('#export-btn');
const shareBtn = $('#share-btn');
const clearFormBtn = $('#clear-form');

const voiceBtn = $('#voice-btn');
const scanBtn = $('#scan-btn');

const scannerBackdrop = $('#scanner-backdrop');
const scannerVideo = $('#scanner-video');
const scannerStatus = $('#scanner-status');
const scannerCancel = $('#scanner-cancel');
const scannerConfirm = $('#scanner-confirm');

let mediaStream = null;

// ====== Renderização ======
function render() {
  const filtered = applyFilters(state.items);
  const sorted = applySort(filtered);
  renderList(sorted);
  renderStats();
  savePrefs();
}

function applyFilters(items) {
  const t = normalize(state.filter.text);
  const cat = state.filter.category;
  const status = state.filter.status;

  return items.filter(it => {
    if (t && !normalize(it.name).includes(t)) return false;
    if (cat && it.category !== cat) return false;
    if (status === 'pending' && it.done) return false;
    if (status === 'done' && !it.done) return false;
    if (status === 'favorites' && !it.favorite) return false;
    return true;
  });
}

function applySort(items) {
  const arr = [...items];
  switch (state.filter.sort) {
    case 'created_asc':
      arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      break;
    case 'name_asc':
      arr.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
      break;
    case 'name_desc':
      arr.sort((a, b) => normalize(b.name).localeCompare(normalize(a.name)));
      break;
    case 'category_asc':
      arr.sort((a, b) => normalize(a.category || '').localeCompare(normalize(b.category || '')) || normalize(a.name).localeCompare(normalize(b.name)));
      break;
    case 'created_desc':
    default:
      arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return arr;
}

function renderList(items) {
  listEl.innerHTML = '';
  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'item';
    empty.innerHTML = `<div class="muted">Nenhum item encontrado</div>`;
    listEl.appendChild(empty);
    return;
  }

  const frag = document.createDocumentFragment();
  for (const it of items) {
    const node = itemTpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = it.id;
    node.dataset.done = String(it.done);

    $('[data-js="name"]', node).textContent = it.name;
    $('[data-js="qty"]', node).textContent = formatQty(it.qty, it.unit);
    const catEl = $('[data-js="category"]', node);
    catEl.textContent = it.category || 'Sem categoria';
    if (!it.category) catEl.hidden = true;

    const flags = [];
    if (it.recurring) flags.push('🔁 Recorrente');
    if (it.favorite) flags.push('★ Favorito');
    const flagsEl = $('[data-js="flags"]', node);
    if (flags.length) {
      flagsEl.hidden = false;
      flagsEl.textContent = flags.join(' ');
    } else {
      flagsEl.hidden = true;
    }

    // Botões
    $('[data-js="toggle"]', node).addEventListener('click', () => toggleDone(it.id));
    $('[data-js="increment"]', node).addEventListener('click', () => changeQty(it.id, +1));
    $('[data-js="decrement"]', node).addEventListener('click', () => changeQty(it.id, -1));
    $('[data-js="edit"]', node).addEventListener('click', () => editItem(it.id));
    $('[data-js="delete"]', node).addEventListener('click', () => deleteItem(it.id));

    frag.appendChild(node);
  }
  listEl.appendChild(frag);
}

function renderStats() {
  const total = state.items.length;
  const done = state.items.filter(i => i.done).length;
  const pending = total - done;
  const cats = new Set(state.items.map(i => i.category).filter(Boolean)).size;

  statTotal.textContent = String(total);
  statPending.textContent = String(pending);
  statDone.textContent = String(done);
  statCats.textContent = String(cats);
}

// ====== Ações ======
function addItem(data) {
  const item = {
    id: uid(),
    name: data.name.trim(),
    qty: clamp(parseInt(data.qty || '1', 10) || 1, 1, 9999),
    unit: data.unit || 'un',
    category: data.category || '',
    recurring: !!data.recurring,
    favorite: !!data.favorite,
    done: false,
    createdAt: now(),
    updatedAt: now(),
    meta: data.meta || {}, // ex: barcode
  };
  state.items.unshift(item);
  saveItems();
  render();
  toast(`Adicionado: ${item.name}`, 'ok');
}

function updateItem(id, patch) {
  const idx = state.items.findIndex(i => i.id === id);
  if (idx === -1) return;
  state.items[idx] = { ...state.items[idx], ...patch, updatedAt: now() };
  saveItems();
  render();
}

function deleteItem(id) {
  const it = state.items.find(i => i.id === id);
  state.items = state.items.filter(i => i.id !== id);
  saveItems();
  render();
  if (it) toast(`Removido: ${it.name}`, 'warn');
}

function toggleDone(id) {
  const it = state.items.find(i => i.id === id);
  if (!it) return;
  updateItem(id, { done: !it.done });
}

function changeQty(id, delta) {
  const it = state.items.find(i => i.id === id);
  if (!it) return;
  const qty = clamp((it.qty || 1) + delta, 1, 9999);
  updateItem(id, { qty });
}

function editItem(id) {
  const it = state.items.find(i => i.id === id);
  if (!it) return;
  const name = prompt('Editar nome do item:', it.name);
  if (name === null) return; // cancelou
  const qtyStr = prompt('Editar quantidade:', String(it.qty));
  if (qtyStr === null) return;
  const qty = clamp(parseInt(qtyStr, 10) || it.qty, 1, 9999);
  updateItem(id, { name: name.trim() || it.name, qty });
}

function markAll() {
  const hasPending = state.items.some(i => !i.done);
  for (const it of state.items) {
    it.done = hasPending ? true : false;
    it.updatedAt = now();
  }
  saveItems();
  render();
  toast(hasPending ? 'Todos marcados como comprados' : 'Todos marcados como pendentes', 'ok');
}

function clearDone() {
  const before = state.items.length;
  state.items = state.items.filter(i => !i.done);
  saveItems();
  render();
  const removed = before - state.items.length;
  toast(removed ? `Removidos ${removed} comprados` : 'Nenhum item comprado para limpar', removed ? 'warn' : 'err');
}

// ====== Exportar e compartilhar ======
function buildTextExport(items = state.items) {
  const lines = [];
  lines.push('Lista de Compras');
  lines.push('================');
  lines.push('');
  for (const it of items) {
    const mark = it.done ? '[x]' : '[ ]';
    const flags = [
      it.recurring ? 'recorrente' : '',
      it.favorite ? 'favorito' : '',
      it.category ? `#${it.category}` : '',
    ].filter(Boolean).join(' ');
    lines.push(`${mark} ${it.name} — ${formatQty(it.qty, it.unit)} ${flags ? `(${flags})` : ''}`);
  }
  return lines.join('\n');
}

function exportTxt() {
  const txt = buildTextExport();
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.download = `lista-compras-${dateStr}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Exportado como .txt', 'ok');
}

async function shareList() {
  const txt = buildTextExport(applySort(applyFilters(state.items)));
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Lista de Compras', text: txt });
      toast('Lista compartilhada', 'ok');
      return;
    } catch (e) {
      // cancelado ou erro — cai no fallback
    }
  }
  try {
    await navigator.clipboard.writeText(txt);
    toast('Lista copiada para a área de transferência', 'ok');
  } catch {
    toast('Não foi possível compartilhar automaticamente', 'err');
  }
}

// ====== Voz (Web Speech API) ======
function parseSpokenToItem(text) {
  // Ex.: "2 kg de arroz", "arroz 2 unidades", "3 leite"
  const t = text.toLowerCase().replace(',', ' ').replace(/\s+/g, ' ').trim();

  const unitMap = {
    'quilo': 'kg', 'quilos': 'kg', 'kg': 'kg', 'kilo': 'kg',
    'grama': 'g', 'gramas': 'g', 'g': 'g',
    'litro': 'L', 'litros': 'L', 'l': 'L',
    'mililitro': 'ml', 'mililitros': 'ml', 'ml': 'ml',
    'unidade': 'un', 'unidades': 'un', 'un': 'un', 'peça': 'un', 'peca': 'un'
  };

  let qty = 1, unit = 'un', name = t;

  // Pega número no começo ou no fim
  const startNum = t.match(/^(\d+)/);
  const endNum = t.match(/(\d+)\s*([a-zA-Z]+)?$/);

  // Procura unidade conhecida
  const unitWord = Object.keys(unitMap).find(u => t.includes(` ${u} `) || t.endsWith(` ${u}`) || t.startsWith(`${u} `));

  if (startNum) {
    qty = parseInt(startNum[1], 10) || 1;
    name = t.replace(/^(\d+)\s*/, '');
  } else if (endNum) {
    qty = parseInt(endNum[1], 10) || 1;
    if (endNum[2]) unit = unitMap[endNum[2].toLowerCase()] || unit;
    name = t.replace(/(\d+)\s*([a-zA-Z]+)?$/, '').trim();
  }

  if (unitWord) {
    unit = unitMap[unitWord] || unit;
    name = name.replace(unitWord, '').replace(/\s+de\s+/, ' ').trim();
  }

  name = name.replace(/\s+de\s+/, ' ').trim();
  if (!name) name = 'Item';

  return { name, qty, unit };
}

function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast('Voz não suportada neste navegador', 'err');
    return;
  }
  const rec = new SR();
  rec.lang = 'pt-BR';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    const txt = e.results[0][0].transcript;
    const parsed = parseSpokenToItem(txt);
    addItem({ ...parsed, category: '', recurring: false, favorite: false });
  };
  rec.onerror = () => toast('Erro no reconhecimento de voz', 'err');
  rec.onend = () => {};
  rec.start();
  toast('Ouvindo… fale o item.', 'ok', 2000);
}

// ====== Scanner (câmera + fallback manual) ======
function openScanner() {
  scannerBackdrop.setAttribute('aria-hidden', 'false');
  scannerConfirm.disabled = true;
  scannerStatus.textContent = 'Iniciando câmera…';

  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        mediaStream = stream;
        scannerVideo.srcObject = stream;
        scannerVideo.play();
        scannerStatus.textContent = 'Câmera ativa. Digite o código abaixo se necessário.';
        ensureScannerInput();
      })
      .catch(() => {
        scannerStatus.textContent = 'Não foi possível acessar a câmera. Use o campo manual.';
        ensureScannerInput();
      });
  } else {
    scannerStatus.textContent = 'Câmera não suportada. Use o campo manual.';
    ensureScannerInput();
  }
}

function ensureScannerInput() {
  let input = $('#manual-barcode');
  if (!input) {
    const box = document.createElement('div');
    box.style.marginTop = '12px';
    box.innerHTML = `
      <label for="manual-barcode" class="muted">Código de barras (manual)</label>
      <input id="manual-barcode" type="text" placeholder="Digite ou cole o código" style="width:100%; margin-top:6px;" />
    `;
    scannerVideo.parentElement.after(box);
    input = $('#manual-barcode');
  }
  scannerConfirm.disabled = false;
  input.focus();
}

function closeScanner() {
  scannerBackdrop.setAttribute('aria-hidden', 'true');
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
}

function useScannerResult() {
  const input = $('#manual-barcode');
  const code = (input?.value || '').trim();
  if (!code) {
    toast('Informe um código de barras', 'err');
    return;
  }
  // Sem decoding: usamos o código para nome placeholder
  nameInput.value = `Produto ${code.slice(-5)}`;
  nameInput.focus();
  toast('Código capturado. Ajuste o nome se quiser e adicione.', 'ok', 3500);
  closeScanner();
}

// ====== Eventos de UI ======
function handleFormSubmit(e) {
  e.preventDefault();
  const data = {
    name: nameInput.value,
    qty: qtyInput.value,
    unit: unitInput.value,
    category: categoryInput.value,
    recurring: recurringInput.checked,
    favorite: favoriteInput.checked,
  };
  if (!data.name.trim()) {
    toast('Informe o nome do item', 'err');
    nameInput.focus();
    return;
  }
  addItem(data);
  form.reset();
  qtyInput.value = '1';
  unitInput.value = unitInput.querySelector('option')?.value || 'un';
  suggestionsEl.textContent = '';
  nameInput.focus();
}

const debouncedSuggest = debounce(() => {
  const q = nameInput.value.trim();
  const list = getSuggestions(q);
  if (!q || list.length === 0) {
    suggestionsEl.textContent = '';
    return;
  }
  suggestionsEl.innerHTML = `Sugestões: ${list.map(s => `<button data-sug="${s}" class="btn ghost" style="margin-left:6px;">${s}</button>`).join('')}`;
  suggestionsEl.querySelectorAll('button[data-sug]').forEach(b => {
    b.addEventListener('click', () => {
      nameInput.value = b.dataset.sug || '';
      suggestionsEl.textContent = '';
      nameInput.focus();
    });
  });
}, 180);

function syncFiltersFromUI() {
  state.filter.text = searchInput.value.trim();
  state.filter.category = categoryFilter.value;
  // status via pill
  state.filter.sort = sortSelect.value;
  render();
}

// ====== Inicialização ======
function hydratePrefs() {
  const prefs = loadPrefs();
  if (!prefs) return;
  const f = prefs.filter || {};
  if (typeof f.text === 'string') {
    state.filter.text = f.text;
    searchInput.value = f.text;
  }
  if (typeof f.category === 'string') {
    state.filter.category = f.category;
    categoryFilter.value = f.category;
  }
  if (typeof f.sort === 'string') {
    state.filter.sort = f.sort;
    sortSelect.value = f.sort;
  }
  if (typeof f.status === 'string') {
    state.filter.status = f.status;
    // Ajusta pills visualmente
    filterPills.forEach(p => p.setAttribute('aria-pressed', String(p.dataset.filter === f.status)));
  }
}

function bindEvents() {
  form.addEventListener('submit', handleFormSubmit);
  clearFormBtn.addEventListener('click', () => {
    form.reset();
    qtyInput.value = '1';
    suggestionsEl.textContent = '';
    nameInput.focus();
  });

  nameInput.addEventListener('input', debouncedSuggest);

  searchInput.addEventListener('input', debounce(syncFiltersFromUI, 150));
  categoryFilter.addEventListener('change', syncFiltersFromUI);
  sortSelect.addEventListener('change', syncFiltersFromUI);

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      state.filter.status = pill.dataset.filter;
      filterPills.forEach(p => p.setAttribute('aria-pressed', String(p === pill)));
      render();
    });
  });

  markAllBtn.addEventListener('click', markAll);
  clearDoneBtn.addEventListener('click', clearDone);
  exportBtn.addEventListener('click', exportTxt);
  shareBtn.addEventListener('click', shareList);

  voiceBtn.addEventListener('click', startVoice);
  scanBtn.addEventListener('click', openScanner);
  scannerCancel.addEventListener('click', closeScanner);
  scannerConfirm.addEventListener('click', useScannerResult);

  // Acessibilidade: Enter no campo nome envia
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
}

function start() {
  hydratePrefs();
  render();
  bindEvents();
}

document.addEventListener('DOMContentLoaded', start);
