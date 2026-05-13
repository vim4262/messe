/* ============================================
   GÉNIE EN HERBE · app.js
   ============================================ */
'use strict';

const MAX_MB     = 10;
const STORAGE_KEY = 'geh_docs_v2';

let allDocs      = [];
let currentFilter = 'all';
let currentDocUrl = null;
let currentDocTitle = '';
let currentDocCat = 'Match officiel';
let selectedFile  = null;

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadDocs();
  renderAll();
  setupDragAndDrop();
  const today = new Date().toISOString().split('T')[0];
  const d = document.getElementById('docDate');
  if (d) d.value = today;
});

// ─────────────────────────────────────────────
// DONNÉES (localStorage)
// ─────────────────────────────────────────────
function loadDocs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    allDocs = raw ? JSON.parse(raw) : [];
  } catch { allDocs = []; }
}

function saveDocs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allDocs));
  } catch {
    showToast('Stockage plein. Supprimez des anciens documents.', 'error');
  }
}

// ─────────────────────────────────────────────
// RENDU
// ─────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderCards();
}

function renderStats() {
  document.getElementById('statTotal').textContent = allDocs.length;
  document.getElementById('statOfficial').textContent = allDocs.filter(d => d.category === 'Match officiel').length;
  document.getElementById('statTrain').textContent = allDocs.filter(d => d.category === 'Entraînement').length;
}

function renderCards() {
  const grid  = document.getElementById('docsGrid');
  const empty = document.getElementById('emptyState');
  const query = (document.getElementById('searchInput')?.value || '').toLowerCase();

  grid.querySelectorAll('.doc-card').forEach(c => c.remove());

  const filtered = allDocs
    .filter(doc => {
      const matchCat = currentFilter === 'all' || doc.category === currentFilter;
      const matchQ   = doc.title.toLowerCase().includes(query) || doc.category.toLowerCase().includes(query);
      return matchCat && matchQ;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filtered.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  filtered.forEach((doc, i) => grid.appendChild(buildCard(doc, i)));
}

function buildCard(doc, i) {
  const card = document.createElement('div');
  card.className = 'doc-card';
  card.style.animationDelay = `${i * 0.05}s`;
  const badgeClass = doc.category === 'Match officiel' ? 'badge-officiel' : 'badge-entrainement';
  card.innerHTML = `
    <div class="card-top">
      <div class="card-pdf-mark"><span>📄</span><small>PDF</small></div>
      <span class="card-badge ${badgeClass}">${escHtml(doc.category)}</span>
    </div>
    <div class="card-title">${escHtml(doc.title)}</div>
    <div class="card-meta">
      <span>${formatDate(doc.date)}</span>
      <span class="card-meta-sep">·</span>
      <span>${doc.sizeLabel || 'PDF'}</span>
    </div>
    <div class="card-actions">
      <button class="btn-read" onclick="openViewer('${doc.id}')">▶ Lire</button>
      <button class="btn-icon" title="Télécharger" onclick="downloadDoc('${doc.id}')">⬇</button>
      <button class="btn-icon del" title="Supprimer" onclick="deleteDoc('${doc.id}')">🗑</button>
    </div>`;
  return card;
}

// ─────────────────────────────────────────────
// FILTRES
// ─────────────────────────────────────────────
function selectCat(btn) {
  currentFilter = btn.dataset.cat;
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCards();
}

function filterDocs() { renderCards(); }

// ─────────────────────────────────────────────
// UPLOAD
// ─────────────────────────────────────────────
function openUploadModal() {
  document.getElementById('uploadModal').classList.add('active');
}

function closeUploadModal(event) {
  if (event && event.target !== document.getElementById('uploadModal')) return;
  document.getElementById('uploadModal').classList.remove('active');
  resetUploadForm();
}

function resetUploadForm() {
  document.getElementById('docTitle').value = '';
  document.getElementById('pdfInput').value = '';
  document.getElementById('dropHint').textContent = 'PDF uniquement · 10 MB max';
  document.getElementById('dropZone').style.borderColor = '';
  document.getElementById('dropZone').style.background  = '';
  document.getElementById('progressWrap').style.display = 'none';
  document.getElementById('progressFill').style.width   = '0%';
  selectedFile  = null;
  currentDocCat = 'Match officiel';
  document.querySelectorAll('.cat-tog').forEach(b => {
    b.classList.toggle('active', b.dataset.val === 'Match officiel');
  });
}

function selectUploadCat(btn) {
  currentDocCat = btn.dataset.val;
  document.querySelectorAll('.cat-tog').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function onFileSelect(input) {
  const file = input.files ? input.files[0] : input;
  if (!file) return;
  if (file.type !== 'application/pdf') { showToast('Veuillez sélectionner un fichier PDF.', 'error'); return; }
  if (file.size > MAX_MB * 1024 * 1024) { showToast(`Fichier trop grand (max ${MAX_MB} MB).`, 'error'); return; }
  selectedFile = file;
  document.getElementById('dropHint').textContent = `✅ ${file.name} — ${formatSize(file.size)}`;
  document.getElementById('dropZone').style.borderColor = 'var(--blue-lt)';
  document.getElementById('dropZone').style.background  = 'var(--sky)';
  if (!document.getElementById('docTitle').value)
    document.getElementById('docTitle').value = file.name.replace(/\.pdf$/i, '');
}

function setupDragAndDrop() {
  const zone = document.getElementById('dropZone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) { try { const dt = new DataTransfer(); dt.items.add(file); document.getElementById('pdfInput').files = dt.files; } catch {} onFileSelect(file); }
  });
}

function submitUpload() {
  const title = document.getElementById('docTitle').value.trim();
  const date  = document.getElementById('docDate').value;
  if (!title)        { showToast('Entrez un titre.', 'error'); return; }
  if (!selectedFile) { showToast('Sélectionnez un fichier PDF.', 'error'); return; }
  if (!date)         { showToast('Entrez la date du match.', 'error'); return; }

  const pw = document.getElementById('progressWrap');
  const pf = document.getElementById('progressFill');
  const pl = document.getElementById('progressLabel');
  pw.style.display = 'block';

  const reader = new FileReader();
  reader.onprogress = e => { if (e.lengthComputable) pf.style.width = Math.round((e.loaded / e.total) * 80) + '%'; };
  reader.onload = e => {
    pf.style.width = '95%'; pl.textContent = 'Enregistrement…';
    setTimeout(() => {
      allDocs.push({
        id: 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        title, category: currentDocCat, date,
        sizeLabel: formatSize(selectedFile.size),
        dataUrl: e.target.result,
        uploadedAt: new Date().toISOString(),
      });
      saveDocs();
      selectedFile = null;
      pf.style.width = '100%'; pl.textContent = 'Enregistré !';
      setTimeout(() => { closeUploadModal(); renderAll(); showToast(`"${title}" ajouté ✓`, 'success'); }, 400);
    }, 300);
  };
  reader.onerror = () => showToast('Erreur de lecture.', 'error');
  reader.readAsDataURL(selectedFile);
}

// ─────────────────────────────────────────────
// VIEWER
// ─────────────────────────────────────────────
function openViewer(docId) {
  const doc = allDocs.find(d => d.id === docId);
  if (!doc) return;
  currentDocUrl = doc.dataUrl; currentDocTitle = doc.title;
  document.getElementById('viewerTitle').textContent = doc.title;
  document.getElementById('viewerCat').textContent   = doc.category;
  document.getElementById('pdfFrame').src = doc.dataUrl;
  document.getElementById('viewerModal').classList.add('active');
}

function closeViewer(event) {
  if (event && event.target !== document.getElementById('viewerModal')) return;
  document.getElementById('viewerModal').classList.remove('active');
  document.getElementById('pdfFrame').src = '';
  currentDocUrl = null;
}

function downloadCurrent() {
  if (currentDocUrl) triggerDownload(currentDocUrl, currentDocTitle);
}

// ─────────────────────────────────────────────
// DOWNLOAD / DELETE
// ─────────────────────────────────────────────
function downloadDoc(docId) {
  const doc = allDocs.find(d => d.id === docId);
  if (!doc) return;
  triggerDownload(doc.dataUrl, doc.title);
  showToast(`Téléchargement de "${doc.title}" ✓`, 'success');
}

function triggerDownload(dataUrl, title) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = title.endsWith('.pdf') ? title : `${title}.pdf`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function deleteDoc(docId) {
  const doc = allDocs.find(d => d.id === docId);
  if (!doc) return;
  if (!confirm(`Supprimer "${doc.title}" ?\nCette action est irréversible.`)) return;
  allDocs = allDocs.filter(d => d.id !== docId);
  saveDocs(); renderAll();
  showToast(`"${doc.title}" supprimé.`, 'success');
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────
function formatDate(str) {
  if (!str) return '—';
  try { return new Date(str + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return str; }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.className = `toast ${type} show`;
  setTimeout(() => { t.className = 'toast'; }, 3500);
}
