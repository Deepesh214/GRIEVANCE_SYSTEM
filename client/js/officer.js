/* Officer queue — only shows grievances assigned to the logged-in officer. */
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireRole('officer')) return;
  renderNav('officer');

  await Promise.all([loadStats(), loadQueue()]);

  document.getElementById('filter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    loadQueue();
  });
});

async function loadStats() {
  try {
    const out = await api.get('/officer/stats');
    const c = out.counts || {};
    document.getElementById('stats').innerHTML = `
      <div class="card stat"><div class="num">${c.in_progress || 0}</div><div class="label">In progress</div></div>
      <div class="card stat"><div class="num">${c.awaiting_input || 0}</div><div class="label">Awaiting input</div></div>
      <div class="card stat"><div class="num">${c.resolved || 0}</div><div class="label">Resolved</div></div>
      <div class="card stat"><div class="num">${(c.pending || 0) + (c.in_progress || 0) + (c.awaiting_input || 0)}</div><div class="label">Open total</div></div>
    `;
  } catch (err) {
    document.getElementById('stats').innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

async function loadQueue() {
  const list = document.getElementById('list');
  list.innerHTML = '<p class="muted">Loading…</p>';
  try {
    const f = new FormData(document.getElementById('filter-form'));
    const params = new URLSearchParams(Object.fromEntries([...f.entries()].filter(([, v]) => v))).toString();
    const out = await api.get(`/officer/grievances${params ? '?' + params : ''}`);
    if (!out.grievances.length) {
      list.innerHTML = '<p class="muted">Nothing in your queue right now.</p>'; return;
    }
    list.innerHTML = `
      <table>
        <thead><tr>
          <th>Title</th><th>Category</th><th>Priority</th><th>Status</th>
          <th>Submitter</th><th>Created</th><th></th>
        </tr></thead>
        <tbody>
          ${out.grievances.map((g) => `
            <tr>
              <td><a href="grievance.html?id=${g._id}">${escapeHtml(g.title)}</a></td>
              <td>${escapeHtml(g.category)}</td>
              <td>${priorityChip(g.priority)}</td>
              <td>${statusChip(g.status)}</td>
              <td>${g.raisedBy ? escapeHtml(g.raisedBy.name) : '—'}</td>
              <td>${fmtDate(g.createdAt)}</td>
              <td><a class="btn small outline" href="grievance.html?id=${g._id}">Open</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    list.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}
