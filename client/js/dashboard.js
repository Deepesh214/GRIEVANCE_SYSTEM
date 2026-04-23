/* Role-aware dashboard. */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireRole();
  if (!user) return;
  renderNav('dashboard');
  const root = document.getElementById('content');

  if (user.role === 'student') return renderStudent(user, root);
  if (user.role === 'officer') return renderOfficer(user, root);
  if (user.role === 'admin') return renderAdmin(user, root);
});

/* ---------- STUDENT ---------- */
async function renderStudent(user, root) {
  root.innerHTML = `
    <h1 class="page-title">Welcome, ${escapeHtml(user.name)}</h1>
    <p class="page-subtitle">Your college ID: <b>${escapeHtml(user.collegeId)}</b> · Department: ${escapeHtml(user.department || '—')}</p>
    <div class="flex wrap mb-2">
      <a class="btn" href="raise.html">+ Raise a new grievance</a>
    </div>
    <h2>Your grievances</h2>
    <div class="card"><div id="mine"></div></div>
  `;

  try {
    const out = await api.get('/grievances/mine');
    const list = out.grievances;
    if (!list.length) {
      document.getElementById('mine').innerHTML = '<p class="muted">You haven\'t filed any grievances yet.</p>';
      return;
    }
    document.getElementById('mine').innerHTML = `
      <table>
        <thead><tr>
          <th>Title</th><th>Category</th><th>Status</th><th>Priority</th>
          <th>Assigned to</th><th>Created</th><th></th>
        </tr></thead>
        <tbody>
        ${list.map((g) => `
          <tr>
            <td>${escapeHtml(g.title)}</td>
            <td>${escapeHtml(g.category)}</td>
            <td>${statusChip(g.status)}</td>
            <td>${priorityChip(g.priority)}</td>
            <td>${g.assignedTo ? escapeHtml(g.assignedTo.name) : '<span class="muted">—</span>'}</td>
            <td>${fmtDate(g.createdAt)}</td>
            <td><a class="btn small outline" href="grievance.html?id=${g._id}">View</a></td>
          </tr>
        `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    document.getElementById('mine').innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

/* ---------- OFFICER (summary on dashboard, full queue in officer.html) ---------- */
async function renderOfficer(user, root) {
  root.innerHTML = `
    <h1 class="page-title">Grievance Resolver dashboard</h1>
    <p class="page-subtitle">Hi ${escapeHtml(user.name)} — here's a snapshot of your queue.</p>
    <div class="grid stats" id="stats"></div>
    <div class="mt-3 flex wrap">
      <a class="btn" href="officer.html">Open my resolver queue →</a>
    </div>
  `;
  try {
    const out = await api.get('/officer/stats');
    const c = out.counts || {};
    document.getElementById('stats').innerHTML = `
      <div class="card stat"><div class="num">${c.in_progress || 0}</div><div class="label">In progress</div></div>
      <div class="card stat"><div class="num">${c.awaiting_input || 0}</div><div class="label">Awaiting input</div></div>
      <div class="card stat"><div class="num">${c.resolved || 0}</div><div class="label">Resolved by you</div></div>
      <div class="card stat"><div class="num">${(c.pending || 0) + (c.in_progress || 0) + (c.awaiting_input || 0)}</div><div class="label">Open total</div></div>
    `;
  } catch (err) {
    document.getElementById('stats').innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

/* ---------- ADMIN ---------- */
async function renderAdmin(user, root) {
  root.innerHTML = `
    <h1 class="page-title">Grievance Officer dashboard</h1>
    <p class="page-subtitle">Hi ${escapeHtml(user.name)} — high-level view of the grievance pipeline.</p>
    <div class="grid stats" id="stats"></div>
    <div class="mt-3 flex wrap">
      <a class="btn" href="admin.html">Open Grievance Officer console →</a>
    </div>
  `;
  try {
    const out = await api.get('/admin/analytics/summary');
    const s = out.byStatus || {};
    document.getElementById('stats').innerHTML = `
      <div class="card stat"><div class="num">${out.total || 0}</div><div class="label">Total grievances</div></div>
      <div class="card stat"><div class="num">${s.pending || 0}</div><div class="label">Pending</div></div>
      <div class="card stat"><div class="num">${s.in_progress || 0}</div><div class="label">In progress</div></div>
      <div class="card stat"><div class="num">${s.resolved || 0}</div><div class="label">Resolved</div></div>
      <div class="card stat"><div class="num">${out.avgResolutionHours || 0}h</div><div class="label">Avg. resolution time</div></div>
    `;
  } catch (err) {
    document.getElementById('stats').innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}
