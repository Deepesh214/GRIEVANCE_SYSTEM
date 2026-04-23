/* Admin console logic — analytics charts + grievance table with actions. */
let officersCache = [];
let categoriesCache = [];
let charts = {};

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireRole('admin')) return;
  renderNav('admin');

  await Promise.all([loadCategories(), loadOfficers(), loadAnalytics()]);
  await loadGrievances();

  // Filter form
  document.getElementById('filter-form').addEventListener('submit', (e) => {
    e.preventDefault(); loadGrievances();
  });

  // Export CSV with current filters applied
  document.getElementById('export-btn').addEventListener('click', (e) => {
    e.preventDefault();
    const params = buildParams();
    const token = api.getToken();
    // Browser blocks Authorization header on direct <a> download; use fetch+blob instead.
    fetch(`${api.base}/admin/export.csv?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.blob()).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'grievances.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }).catch((err) => alert('Export failed: ' + err.message));
  });
});

async function loadCategories() {
  try {
    const out = await api.get('/grievances/categories');
    categoriesCache = out.categories;
    const sel = document.getElementById('filter-category');
    sel.innerHTML = '<option value="">All categories</option>' +
      categoriesCache.map((c) => `<option value="${c}">${c}</option>`).join('');
  } catch (err) { console.error(err); }
}

async function loadOfficers() {
  try {
    const out = await api.get('/admin/officers');
    officersCache = out.officers;
  } catch (err) { console.error(err); }
}

async function loadAnalytics() {
  try {
    const s = await api.get('/admin/analytics/summary');
    const sts = s.byStatus || {};
    document.getElementById('stats').innerHTML = `
      <div class="card stat"><div class="num">${s.total || 0}</div><div class="label">Total</div></div>
      <div class="card stat"><div class="num">${sts.pending || 0}</div><div class="label">Pending</div></div>
      <div class="card stat"><div class="num">${sts.in_progress || 0}</div><div class="label">In progress</div></div>
      <div class="card stat"><div class="num">${sts.resolved || 0}</div><div class="label">Resolved</div></div>
      <div class="card stat"><div class="num">${s.avgResolutionHours || 0}h</div><div class="label">Avg. resolution</div></div>
    `;
    renderStatusChart(sts);
    renderCategoryChart(s.byCategory || {});
  } catch (err) {
    document.getElementById('stats').innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

function renderStatusChart(byStatus) {
  const canvas = document.getElementById('chart-status');
  if (!canvas || !window.Chart) return;
  const labels = Object.keys(byStatus);
  const data = Object.values(byStatus);
  const colors = ['#f59e0b', '#2563eb', '#a855f7', '#10b981', '#ef4444'];
  if (charts.status) charts.status.destroy();
  charts.status = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors.slice(0, labels.length) }] },
    options: { plugins: { legend: { position: 'bottom' } } },
  });
}

function renderCategoryChart(byCategory) {
  const canvas = document.getElementById('chart-category');
  if (!canvas || !window.Chart) return;
  const labels = Object.keys(byCategory);
  const data = Object.values(byCategory);
  if (charts.category) charts.category.destroy();
  charts.category = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: '#2563eb' }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, precision: 0 } } },
  });
}

function buildParams() {
  const f = new FormData(document.getElementById('filter-form'));
  const obj = Object.fromEntries([...f.entries()].filter(([, v]) => v !== ''));
  return new URLSearchParams(obj).toString();
}

async function loadGrievances() {
  const list = document.getElementById('list');
  list.innerHTML = '<p class="muted">Loading…</p>';
  try {
    const params = buildParams();
    const out = await api.get(`/admin/grievances?${params}`);
    if (!out.grievances.length) { list.innerHTML = '<p class="muted">No grievances match your filters.</p>'; return; }

    list.innerHTML = `
      <table>
        <thead><tr>
          <th>Title</th><th>Category</th><th>Priority</th><th>Status</th>
          <th>Submitter</th><th>Assigned</th><th>Created</th><th>Actions</th>
        </tr></thead>
        <tbody>
        ${out.grievances.map((g) => `
          <tr>
            <td><a href="grievance.html?id=${g._id}">${escapeHtml(g.title)}</a></td>
            <td>${escapeHtml(g.category)}</td>
            <td>${priorityChip(g.priority)}</td>
            <td>${statusChip(g.status)}</td>
            <td>${g.raisedBy ? escapeHtml(g.raisedBy.name) : '—'}<br><span class="muted">${g.raisedBy ? escapeHtml(g.raisedBy.collegeId || '') : ''}</span></td>
            <td>${g.assignedTo ? escapeHtml(g.assignedTo.name) : '<span class="muted">unassigned</span>'}</td>
            <td>${fmtDate(g.createdAt)}</td>
            <td>
              <div class="flex wrap" style="gap:6px;">
                <select data-assign="${g._id}">
                  <option value="">Assign Grievance Resolver…</option>
                  ${officersCache.map((o) => `<option value="${o._id}" ${g.assignedTo && g.assignedTo._id === o._id ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('')}
                </select>
                <button class="btn small outline" data-note="${g._id}">Note</button>
                <button class="btn small danger" data-resolve="${g._id}">Resolve</button>
              </div>
            </td>
          </tr>
        `).join('')}
        </tbody>
      </table>
      <p class="muted mt-2">Showing ${out.grievances.length} of ${out.total} · page ${out.page}</p>
    `;

    list.querySelectorAll('select[data-assign]').forEach((sel) => {
      sel.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-assign');
        const officerId = e.target.value;
        if (!officerId) return;
        try {
          await api.post(`/admin/grievances/${id}/assign`, { officerId });
          await Promise.all([loadAnalytics(), loadGrievances()]);
        } catch (err) { alert(err.message); }
      });
    });
    list.querySelectorAll('button[data-note]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-note');
        const note = prompt('Internal note (visible to admins/officers only):');
        if (!note) return;
        try {
          await api.post(`/admin/grievances/${id}/notes`, { note });
          alert('Note added.');
        } catch (err) { alert(err.message); }
      });
    });
    list.querySelectorAll('button[data-resolve]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-resolve');
        const summary = prompt('Resolution summary for the student:');
        if (summary === null) return;
        try {
          await api.post(`/admin/grievances/${id}/resolve`, { summary });
          await Promise.all([loadAnalytics(), loadGrievances()]);
        } catch (err) { alert(err.message); }
      });
    });
  } catch (err) {
    list.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}
