
// =====================================================================
// SnippetHub - Advanced Frontend (jQuery + Bootstrap 5 + Highlight.js)
// =====================================================================

const API = 'http://localhost:3000/api';
let allSnippets = [];
let currentPage = 1;
let currentView = 'grid';
let activeTag = '';
let currentSnippetId = null;
let selectedAvatar = '👤';
let selectedColor = '#0d6efd';
let filterTimer = null;

// ─── THEME ────────────────────────────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  $('#theme-icon').toggleClass('bi-moon-stars bi-sun');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

function applyTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  if (saved === 'light') $('#theme-icon').removeClass('bi-moon-stars').addClass('bi-sun');
}

// ─── PAGE ROUTING ─────────────────────────────────────────────────────────────
function showPage(page) {
  $('.page').addClass('d-none');
  $(`#page-${page}`).removeClass('d-none');
  $('.nav-tab-btn').removeClass('active');
  $(`.nav-tab-btn[onclick="showPage('${page}')"]`).addClass('active');

  if (page === 'dashboard')   fetchSnippets();
  if (page === 'explore')     fetchExplore();
  if (page === 'collections') fetchCollections();
  if (page === 'stats')       fetchStats();
  if (page === 'profile')     fetchProfile();
}

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('token'); }
function getUser()  { return JSON.parse(localStorage.getItem('user') || '{}'); }

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  $('#nav-user').addClass('d-none');
  $('#nav-auth').removeClass('d-none');
  $('#nav-tabs').addClass('d-none');
  showPage('login');
  toast('Logged out successfully.', 'secondary');
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
function register() {
  const username = $('#reg-username').val().trim();
  const email    = $('#reg-email').val().trim();
  const password = $('#reg-password').val().trim();

  if (!username || !email || !password) {
    return showAlert('#register-alert', 'All fields are required.', 'danger');
  }
  if (password.length < 6) {
    return showAlert('#register-alert', 'Password must be at least 6 characters.', 'danger');
  }

  $.ajax({
    url: `${API}/auth/register`, method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ username, email, password }),
    success: () => {
      showAlert('#register-alert', 'Account created! Please login.', 'success');
      setTimeout(() => showPage('login'), 1500);
    },
    error: (xhr) => showAlert('#register-alert', xhr.responseJSON?.message || 'Registration failed.', 'danger')
  });
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function login() {
  const email    = $('#login-email').val().trim();
  const password = $('#login-password').val().trim();

  if (!email || !password) {
    return showAlert('#login-alert', 'Email and password are required.', 'danger');
  }

  $.ajax({
    url: `${API}/auth/login`, method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ email, password }),
    success: (res) => {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      loadDashboard();
    },
    error: (xhr) => showAlert('#login-alert', xhr.responseJSON?.message || 'Login failed.', 'danger')
  });
}

// ─── LOAD DASHBOARD ───────────────────────────────────────────────────────────
function loadDashboard() {
  const user = getUser();
  $('#nav-username').text(user.username);
  $('#nav-avatar').text(user.avatar || '👤');
  $('#nav-auth').addClass('d-none');
  $('#nav-user').removeClass('d-none');
  $('#nav-tabs').removeClass('d-none');
  showPage('dashboard');
}

// ─── FETCH SNIPPETS ───────────────────────────────────────────────────────────
function fetchSnippets() {
  const search = $('#search-input').val().trim();
  const lang   = $('#lang-filter').val();
  const sort   = $('#sort-filter').val() || 'newest';

  let params = `?sort=${sort}&page=${currentPage}&limit=12`;
  if (search) params += `&search=${encodeURIComponent(search)}`;
  if (lang)   params += `&language=${lang}`;
  if (activeTag) params += `&tag=${encodeURIComponent(activeTag)}`;

  $('#snippets-container').html('<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div></div>');

  $.ajax({
    url: `${API}/snippets${params}`,
    headers: { Authorization: `Bearer ${getToken()}` },
    success: (res) => {
      allSnippets = res.snippets;
      renderSnippets(allSnippets);
      renderPagination(res.total, res.page, res.limit);
      buildTagCloud(allSnippets);
    },
    error: () => $('#snippets-container').html('<p class="text-danger text-center">Failed to load snippets.</p>')
  });
}

// ─── RENDER SNIPPETS ──────────────────────────────────────────────────────────
function renderSnippets(snippets) {
  if (!snippets.length) {
    $('#snippets-container').html(`
      <div class="col-12 text-center text-muted py-5">
        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
        No snippets found. Click <strong>New Snippet</strong> to add one!
      </div>`);
    return;
  }

  if (currentView === 'grid') {
    let html = '';
    snippets.forEach(s => {
      const tags = s.tags ? s.tags.split(',').map(t => `<span class="tag-pill">${esc(t)}</span>`).join('') : '';
      const codeEsc = esc(s.code ? s.code.substring(0, 200) : '');
      html += `
        <div class="col-md-6 col-lg-4">
          <div class="card snippet-card lang-${s.language} h-100" onclick="viewSnippet(${s.id})">
            <div class="card-body pb-2">
              <div class="d-flex justify-content-between align-items-start mb-1">
                <h6 class="card-title mb-0 fw-bold text-truncate" style="max-width:75%">${esc(s.title)}</h6>
                <span class="badge bg-secondary" style="font-size:10px;text-transform:uppercase">${s.language}</span>
              </div>
              <p class="text-muted small mb-2" style="font-size:12px">${esc(s.description || '')}</p>
              <div class="code-preview">${codeEsc}</div>
              <div class="d-flex flex-wrap gap-1 mt-2">${tags}</div>
            </div>
            <div class="card-footer bg-transparent d-flex align-items-center gap-2 py-2">
              <small class="text-muted"><i class="bi bi-eye"></i> ${s.views || 0}</small>
              <small class="text-muted"><i class="bi bi-heart"></i> ${s.like_count || 0}</small>
              <small class="text-muted"><i class="bi bi-chat"></i> ${s.comment_count || 0}</small>
              <div class="ms-auto d-flex gap-1" onclick="event.stopPropagation()">
                <button class="btn btn-xs" onclick="openEditModal(${s.id})" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-xs text-danger" onclick="deleteSnippet(${s.id})" title="Delete"><i class="bi bi-trash"></i></button>
              </div>
            </div>
          </div>
        </div>`;
    });
    $('#snippets-container').html(html);
  } else {
    let html = '<div class="col-12 d-flex flex-column gap-2">';
    snippets.forEach(s => {
      html += `
        <div class="snippet-list-item lang-${s.language}" onclick="viewSnippet(${s.id})">
          <span class="badge bg-secondary" style="min-width:60px;text-align:center;text-transform:uppercase;font-size:10px">${s.language}</span>
          <div class="flex-grow-1">
            <div class="fw-semibold">${esc(s.title)}</div>
            <div class="text-muted small">${esc(s.description || '')}</div>
          </div>
          <small class="text-muted d-none d-md-block"><i class="bi bi-eye"></i> ${s.views || 0}</small>
          <small class="text-muted d-none d-md-block"><i class="bi bi-heart"></i> ${s.like_count || 0}</small>
          <div class="d-flex gap-1" onclick="event.stopPropagation()">
            <button class="btn btn-xs" onclick="openEditModal(${s.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-xs text-danger" onclick="deleteSnippet(${s.id})"><i class="bi bi-trash"></i></button>
          </div>
        </div>`;
    });
    html += '</div>';
    $('#snippets-container').html(html);
  }
}

// ─── TAG CLOUD ────────────────────────────────────────────────────────────────
function buildTagCloud(snippets) {
  const tagMap = {};
  snippets.forEach(s => {
    if (s.tags) s.tags.split(',').forEach(t => { tagMap[t.trim()] = (tagMap[t.trim()] || 0) + 1; });
  });
  if (!Object.keys(tagMap).length) { $('#tag-cloud').html(''); return; }
  let html = '<small class="text-muted me-1">Tags:</small>';
  Object.entries(tagMap).sort((a,b) => b[1]-a[1]).slice(0,10).forEach(([tag, cnt]) => {
    const active = activeTag === tag ? 'active' : '';
    html += `<span class="tag-pill ${active}" onclick="filterByTag('${esc(tag)}')">${esc(tag)} <span class="opacity-50">${cnt}</span></span>`;
  });
  $('#tag-cloud').html(html);
}

function filterByTag(tag) {
  activeTag = activeTag === tag ? '' : tag;
  currentPage = 1;
  fetchSnippets();
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────
function renderPagination(total, page, limit) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) { $('#pagination').html(''); return; }
  let html = '';
  if (page > 1) html += `<button class="page-btn" onclick="goPage(${page-1})"><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn ${i===page?'active':''}" onclick="goPage(${i})">${i}</button>`;
  }
  if (page < pages) html += `<button class="page-btn" onclick="goPage(${page+1})"><i class="bi bi-chevron-right"></i></button>`;
  $('#pagination').html(html);
}

function goPage(p) { currentPage = p; fetchSnippets(); window.scrollTo(0,0); }

// ─── VIEW TOGGLE ─────────────────────────────────────────────────────────────
function setView(v) {
  currentView = v;
  $('#grid-btn, #list-btn').removeClass('active');
  $(`#${v}-btn`).addClass('active');
  renderSnippets(allSnippets);
}

// ─── FILTER / DEBOUNCE ────────────────────────────────────────────────────────
function debounceFilter() {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(() => { currentPage = 1; fetchSnippets(); }, 350);
}

function filterSnippets() { currentPage = 1; fetchSnippets(); }

// ─── VIEW SNIPPET MODAL ───────────────────────────────────────────────────────
function viewSnippet(id) {
  currentSnippetId = id;
  $.ajax({
    url: `${API}/snippets/${id}`,
    headers: { Authorization: `Bearer ${getToken()}` },
    success: (res) => {
      const s = res.snippet;
      $('#view-title').text(s.title);
      $('#view-meta').text(`by ${s.username}  •  ${s.language.toUpperCase()}  •  ${timeAgo(s.created_at)}`);
      $('#view-lang-badge').text(s.language).attr('class', `badge bg-secondary`);
      $('#like-count').text(res.snippet.like_count || 0);

      // Tags
      const tagsHtml = s.tags ? s.tags.split(',').map(t => `<span class="tag-pill">${esc(t)}</span>`).join('') : '';
      $('#view-tags').html(tagsHtml);

      // Syntax highlighted code
      const codeEl = document.getElementById('view-code');
      codeEl.textContent = s.code;
      codeEl.className = `language-${s.language}`;
      hljs.highlightElement(codeEl);

      // Share button
      if (s.is_public && s.share_token) {
        $('#share-btn').show().data('token', s.share_token);
      } else {
        $('#share-btn').hide();
      }

      // Comments
      renderComments(res.comments || []);

      new bootstrap.Modal(document.getElementById('viewModal')).show();
    },
    error: () => toast('Failed to load snippet.', 'danger')
  });
}

function renderComments(comments) {
  if (!comments.length) {
    $('#comments-list').html('<p class="text-muted small">No comments yet. Be the first!</p>');
    return;
  }
  let html = '';
  comments.forEach(c => {
    html += `
      <div class="comment-item">
        <div class="d-flex justify-content-between">
          <span class="comment-author">${c.avatar || '👤'} ${esc(c.username)}</span>
          <span class="comment-time">${timeAgo(c.created_at)}</span>
        </div>
        <div class="comment-text">${esc(c.content)}</div>
      </div>`;
  });
  $('#comments-list').html(html);
}

function addComment() {
  const content = $('#comment-input').val().trim();
  if (!content) return;
  $.ajax({
    url: `${API}/snippets/${currentSnippetId}/comment`,
    method: 'POST',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${getToken()}` },
    data: JSON.stringify({ content }),
    success: () => {
      $('#comment-input').val('');
      // Reload comments
      viewSnippet(currentSnippetId);
      toast('Comment added!', 'success');
    },
    error: () => toast('Failed to add comment.', 'danger')
  });
}

function toggleLike() {
  $.ajax({
    url: `${API}/snippets/${currentSnippetId}/like`,
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    success: (res) => {
      const cur = parseInt($('#like-count').text()) || 0;
      $('#like-count').text(res.liked ? cur + 1 : Math.max(0, cur - 1));
      $('#like-btn').toggleClass('btn-outline-danger btn-danger', res.liked);
      toast(res.liked ? '❤️ Liked!' : 'Unliked.', 'secondary');
    }
  });
}

function shareSnippet() {
  const token = $('#share-btn').data('token');
  if (!token) return;
  const link = `${window.location.origin}/api/snippets/share/${token}`;
  navigator.clipboard.writeText(link).then(() => toast('🔗 Share link copied!', 'success'));
}

function copyViewCode() {
  const code = document.getElementById('view-code').textContent;
  navigator.clipboard.writeText(code).then(() => toast('📋 Code copied!', 'success'));
}

// ─── ADD / EDIT MODAL ─────────────────────────────────────────────────────────
function openAddModal() {
  $('#modal-title').html('<i class="bi bi-code-square"></i> New Snippet');
  $('#edit-id').val('');
  $('#snippet-title').val('');
  $('#snippet-lang').val('c');
  $('#snippet-code').val('');
  $('#snippet-desc').val('');
  $('#snippet-tags').val('');
  $('#snippet-public').prop('checked', false);
  $('#modal-alert').html('');
  $('#editor-lang-label').text('c');
  new bootstrap.Modal(document.getElementById('snippetModal')).show();
}

function openEditModal(id) {
  const s = allSnippets.find(x => x.id === id);
  if (!s) return;
  $('#modal-title').html('<i class="bi bi-pencil-square"></i> Edit Snippet');
  $('#edit-id').val(s.id);
  $('#snippet-title').val(s.title);
  $('#snippet-lang').val(s.language);
  $('#snippet-code').val(s.code);
  $('#snippet-desc').val(s.description || '');
  $('#snippet-tags').val(s.tags || '');
  $('#snippet-public').prop('checked', s.is_public == 1);
  $('#modal-alert').html('');
  $('#editor-lang-label').text(s.language);
  new bootstrap.Modal(document.getElementById('snippetModal')).show();
}

function updateEditorLang() {
  $('#editor-lang-label').text($('#snippet-lang').val());
}

function copyCode() {
  navigator.clipboard.writeText($('#snippet-code').val()).then(() => toast('📋 Copied!', 'success'));
}

function formatCode() {
  // Basic indent normalizer
  let code = $('#snippet-code').val();
  code = code.replace(/\t/g, '  ');
  $('#snippet-code').val(code);
  toast('Code formatted.', 'secondary');
}

// ─── SAVE SNIPPET ─────────────────────────────────────────────────────────────
function saveSnippet() {
  const id   = $('#edit-id').val();
  const tags = $('#snippet-tags').val().split(',').map(t => t.trim()).filter(Boolean);
  const data = {
    title:       $('#snippet-title').val().trim(),
    language:    $('#snippet-lang').val(),
    code:        $('#snippet-code').val().trim(),
    description: $('#snippet-desc').val().trim(),
    is_public:   $('#snippet-public').is(':checked') ? 1 : 0,
    tags
  };

  if (!data.title || !data.code) {
    return showAlert('#modal-alert', 'Title and code are required.', 'danger');
  }

  $.ajax({
    url:    id ? `${API}/snippets/${id}` : `${API}/snippets`,
    method: id ? 'PUT' : 'POST',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${getToken()}` },
    data: JSON.stringify(data),
    success: () => {
      bootstrap.Modal.getInstance(document.getElementById('snippetModal')).hide();
      fetchSnippets();
      toast(id ? '✅ Snippet updated!' : '✅ Snippet saved!', 'success');
    },
    error: (xhr) => showAlert('#modal-alert', xhr.responseJSON?.message || 'Failed to save.', 'danger')
  });
}

// ─── DELETE SNIPPET ───────────────────────────────────────────────────────────
function deleteSnippet(id) {
  if (!confirm('Delete this snippet? This cannot be undone.')) return;
  $.ajax({
    url: `${API}/snippets/${id}`, method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
    success: () => { fetchSnippets(); toast('🗑️ Snippet deleted.', 'secondary'); },
    error: () => toast('Failed to delete.', 'danger')
  });
}

// ─── EXPLORE ──────────────────────────────────────────────────────────────────
function fetchExplore() {
  const search = $('#explore-search').val().trim();
  const lang   = $('#explore-lang').val();
  const sort   = $('#explore-sort').val() || 'popular';

  let params = `?sort=${sort}`;
  if (search) params += `&search=${encodeURIComponent(search)}`;
  if (lang)   params += `&language=${lang}`;

  $('#explore-container').html('<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div></div>');

  $.ajax({
    url: `${API}/snippets/explore${params}`,
    headers: { Authorization: `Bearer ${getToken()}` },
    success: (res) => {
      if (!res.snippets.length) {
        $('#explore-container').html('<div class="col-12 text-center text-muted py-5"><i class="bi bi-compass fs-1 d-block mb-2"></i>No public snippets found.</div>');
        return;
      }
      let html = '';
      res.snippets.forEach(s => {
        const tags = s.tags ? s.tags.split(',').map(t => `<span class="tag-pill">${esc(t)}</span>`).join('') : '';
        const codeEsc = esc(s.code_preview || '');
        html += `
          <div class="col-md-6 col-lg-4">
            <div class="card snippet-card lang-${s.language} h-100">
              <div class="card-body pb-2">
                <div class="d-flex justify-content-between align-items-start mb-1">
                  <h6 class="card-title mb-0 fw-bold text-truncate" style="max-width:75%">${esc(s.title)}</h6>
                  <span class="badge bg-secondary" style="font-size:10px;text-transform:uppercase">${s.language}</span>
                </div>
                <small class="text-muted"><span>${s.avatar || '👤'}</span> ${esc(s.username)} • ${timeAgo(s.created_at)}</small>
                <p class="text-muted small mt-1 mb-2">${esc(s.description || '')}</p>
                <div class="code-preview">${codeEsc}</div>
                <div class="d-flex flex-wrap gap-1 mt-2">${tags}</div>
              </div>
              <div class="card-footer bg-transparent d-flex align-items-center gap-3 py-2">
                <small class="text-muted"><i class="bi bi-eye"></i> ${s.views || 0}</small>
                <small class="text-muted"><i class="bi bi-heart"></i> ${s.like_count || 0}</small>
                <small class="text-muted"><i class="bi bi-chat"></i> ${s.comment_count || 0}</small>
              </div>
            </div>
          </div>`;
      });
      $('#explore-container').html(html);
    },
    error: () => $('#explore-container').html('<p class="text-danger text-center">Failed to load.</p>')
  });
}

let exploreTimer = null;
function debounceExplore() {
  clearTimeout(exploreTimer);
  exploreTimer = setTimeout(fetchExplore, 350);
}

// ─── COLLECTIONS ─────────────────────────────────────────────────────────────
function fetchCollections() {
  $.ajax({
    url: `${API}/collections`,
    headers: { Authorization: `Bearer ${getToken()}` },
    success: (res) => {
      if (!res.collections.length) {
        $('#collections-container').html('<div class="col-12 text-center text-muted py-5"><i class="bi bi-folder fs-1 d-block mb-2"></i>No collections yet.</div>');
        return;
      }
      let html = '';
      res.collections.forEach(c => {
        html += `
          <div class="col-md-4 col-sm-6">
            <div class="card collection-card h-100" style="border-left-color:${c.color}!important">
              <div class="card-body">
                <div class="d-flex align-items-center gap-2 mb-2">
                  <span style="width:14px;height:14px;border-radius:50%;background:${c.color};display:inline-block"></span>
                  <h6 class="mb-0 fw-bold">${esc(c.name)}</h6>
                </div>
                <p class="text-muted small mb-0"><i class="bi bi-code-square"></i> ${c.snippet_count} snippet${c.snippet_count !== 1 ? 's' : ''}</p>
                <small class="text-muted">Created ${timeAgo(c.created_at)}</small>
              </div>
              <div class="card-footer bg-transparent">
                <button class="btn btn-xs text-danger" onclick="deleteCollection(${c.id})"><i class="bi bi-trash"></i> Delete</button>
              </div>
            </div>
          </div>`;
      });
      $('#collections-container').html(html);
    }
  });
}

function openNewCollectionModal() {
  $('#col-name').val('');
  $('#col-alert').html('');
  selectedColor = '#0d6efd';
  const colors = ['#0d6efd','#6f42c1','#d63384','#dc3545','#fd7e14','#ffc107','#198754','#0dcaf0','#6c757d'];
  let html = '';
  colors.forEach(c => {
    html += `<div class="color-dot ${c===selectedColor?'selected':''}" style="background:${c}" onclick="pickColor('${c}', this)"></div>`;
  });
  $('#color-picker').html(html);
  new bootstrap.Modal(document.getElementById('collectionModal')).show();
}

function pickColor(color, el) {
  selectedColor = color;
  $('#col-color').val(color);
  $('.color-dot').removeClass('selected');
  $(el).addClass('selected');
}

function createCollection() {
  const name = $('#col-name').val().trim();
  if (!name) return showAlert('#col-alert', 'Name is required.', 'danger');
  $.ajax({
    url: `${API}/collections`, method: 'POST',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${getToken()}` },
    data: JSON.stringify({ name, color: selectedColor }),
    success: () => {
      bootstrap.Modal.getInstance(document.getElementById('collectionModal')).hide();
      fetchCollections();
      toast('📁 Collection created!', 'success');
    },
    error: (xhr) => showAlert('#col-alert', xhr.responseJSON?.message || 'Failed.', 'danger')
  });
}

function deleteCollection(id) {
  if (!confirm('Delete this collection?')) return;
  $.ajax({
    url: `${API}/collections/${id}`, method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
    success: () => { fetchCollections(); toast('Collection deleted.', 'secondary'); }
  });
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function fetchStats() {
  $.ajax({
    url: `${API}/snippets/stats`,
    headers: { Authorization: `Bearer ${getToken()}` },
    success: (res) => {
      const s = res.stats;
      $('#stats-cards').html(`
        <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-number text-primary">${s.total}</div><div class="stat-label">Total Snippets</div></div></div>
        <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-number text-success">${s.public}</div><div class="stat-label">Public</div></div></div>
        <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-number text-info">${s.views}</div><div class="stat-label">Total Views</div></div></div>
        <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-number text-danger">${s.likes}</div><div class="stat-label">Total Likes</div></div></div>
      `);

      // Language bars
      const maxCnt = s.topLanguages[0]?.cnt || 1;
      let langHtml = '';
      const langColors = { c:'#aaa', cpp:'#0057b7', python:'#3572A5', java:'#b07219', javascript:'#f1e05a', sql:'#e38c00', html:'#e34c26', php:'#4F5D95' };
      s.topLanguages.forEach(l => {
        const pct = Math.round((l.cnt / maxCnt) * 100);
        const color = langColors[l.language] || '#6c757d';
        langHtml += `
          <div class="lang-bar-row">
            <div class="lang-bar-label"><span>${l.language.toUpperCase()}</span><span>${l.cnt} snippet${l.cnt>1?'s':''}</span></div>
            <div class="lang-bar-track"><div class="lang-bar-fill" style="width:${pct}%;background:${color}"></div></div>
          </div>`;
      });
      $('#lang-chart').html(langHtml || '<p class="text-muted small">No data yet.</p>');

      // Activity
      const actionIcons = { created:'✅', updated:'✏️', deleted:'🗑️' };
      let actHtml = '';
      s.recentActivity.forEach(a => {
        actHtml += `
          <div class="activity-item">
            <span class="activity-icon">${actionIcons[a.action] || '📌'}</span>
            <div>
              <div style="font-size:13px"><strong>${a.action}</strong> — ${esc(a.detail || '')}</div>
              <div class="text-muted" style="font-size:11px">${timeAgo(a.created_at)}</div>
            </div>
          </div>`;
      });
      $('#activity-list').html(actHtml || '<p class="text-muted small">No recent activity.</p>');
    }
  });
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function fetchProfile() {
  $.ajax({
    url: `${API}/profile`,
    headers: { Authorization: `Bearer ${getToken()}` },
    success: (res) => {
      const u = res.user;
      selectedAvatar = u.avatar || '👤';
      $('#profile-bio').val(u.bio || '');
      buildAvatarPicker(selectedAvatar);
    }
  });
}

function buildAvatarPicker(current) {
  const avatars = ['👤','😎','🧑‍💻','👩‍💻','🦊','🐱','🐼','🦁','🚀','⚡','🔥','💡'];
  let html = '';
  avatars.forEach(a => {
    html += `<span class="avatar-opt ${a===current?'selected':''}" onclick="selectAvatar('${a}', this)">${a}</span>`;
  });
  $('#avatar-picker').html(html);
}

function selectAvatar(a, el) {
  selectedAvatar = a;
  $('.avatar-opt').removeClass('selected');
  $(el).addClass('selected');
}

function saveProfile() {
  $.ajax({
    url: `${API}/profile`, method: 'PUT',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${getToken()}` },
    data: JSON.stringify({ bio: $('#profile-bio').val().trim(), avatar: selectedAvatar }),
    success: () => {
      $('#nav-avatar').text(selectedAvatar);
      const user = getUser();
      user.avatar = selectedAvatar;
      localStorage.setItem('user', JSON.stringify(user));
      showAlert('#profile-alert', '✅ Profile updated!', 'success');
      toast('Profile saved!', 'success');
    },
    error: () => showAlert('#profile-alert', 'Failed to update profile.', 'danger')
  });
}

function changePassword() {
  const cur = $('#cur-pass').val().trim();
  const nw  = $('#new-pass').val().trim();
  if (!cur || !nw) return showAlert('#pass-alert', 'Both fields required.', 'danger');
  if (nw.length < 6) return showAlert('#pass-alert', 'New password must be at least 6 characters.', 'danger');

  $.ajax({
    url: `${API}/profile/password`, method: 'PUT',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${getToken()}` },
    data: JSON.stringify({ currentPassword: cur, newPassword: nw }),
    success: () => {
      $('#cur-pass, #new-pass').val('');
      showAlert('#pass-alert', '✅ Password changed!', 'success');
      toast('Password updated!', 'success');
    },
    error: (xhr) => showAlert('#pass-alert', xhr.responseJSON?.message || 'Failed.', 'danger')
  });
}

// ─── PASSWORD STRENGTH ────────────────────────────────────────────────────────
$('#reg-password').on('input', function() {
  const val = $(this).val();
  let strength = 0;
  if (val.length >= 6) strength++;
  if (/[A-Z]/.test(val)) strength++;
  if (/[0-9]/.test(val)) strength++;
  if (/[^A-Za-z0-9]/.test(val)) strength++;
  const colors = ['', '#ef4444', '#f59e0b', '#22c55e', '#0d6efd'];
  const widths  = ['0%', '25%', '50%', '75%', '100%'];
  $('#pass-strength').css({ width: widths[strength], background: colors[strength], height: '4px', borderRadius: '2px' });
});

// ─── TOGGLE PASSWORD VISIBILITY ───────────────────────────────────────────────
function togglePass(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function showAlert(selector, message, type) {
  $(selector).html(`<div class="alert alert-${type} py-2 small mb-2">${message}</div>`);
  setTimeout(() => $(selector).html(''), 4000);
}

function toast(message, type = 'primary') {
  const typeClass = { success:'bg-success', danger:'bg-danger', secondary:'bg-secondary', primary:'bg-primary' };
  const el = document.getElementById('toast');
  el.className = `toast align-items-center border-0 text-white ${typeClass[type] || 'bg-primary'}`;
  $('#toast-msg').text(message);
  new bootstrap.Toast(el, { delay: 2500 }).show();
}

// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────────
$(document).on('keydown', function(e) {
  // Ctrl+K = focus search
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    $('#search-input').focus();
  }
  // Ctrl+N = new snippet
  if (e.ctrlKey && e.key === 'n' && getToken()) {
    e.preventDefault();
    if ($('#page-dashboard').is(':visible')) openAddModal();
  }
});

// ─── TAB KEY IN CODE EDITOR ───────────────────────────────────────────────────
$('#snippet-code').on('keydown', function(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = this.selectionStart;
    const end   = this.selectionEnd;
    this.value = this.value.substring(0, start) + '  ' + this.value.substring(end);
    this.selectionStart = this.selectionEnd = start + 2;
  }
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
$(document).ready(function () {
  applyTheme();
  if (getToken()) {
    loadDashboard();
  } else {
    showPage('login');
  }
});
