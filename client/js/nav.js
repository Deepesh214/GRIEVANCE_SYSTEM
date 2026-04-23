/**
 * Shared header/nav rendering.
 * Each page has <div id="nav-root"></div> and calls renderNav(activePage).
 */
function renderNav(active) {
  const user = api.getUser();
  const root = document.getElementById('nav-root');
  if (!root) return;

  const links = [
    { label: 'Home', href: 'index.html', key: 'home' },
  ];
  if (user) {
    links.push({ label: 'Dashboard', href: 'dashboard.html', key: 'dashboard' });
    if (user.role === 'student') links.push({ label: 'Raise grievance', href: 'raise.html', key: 'raise' });
    if (user.role === 'admin') {
      links.push({ label: 'Grievance Officer console', href: 'admin.html', key: 'admin' });
      links.push({ label: 'Access management', href: 'access.html', key: 'access' });
    }
    if (user.role === 'officer') links.push({ label: 'My resolver queue', href: 'officer.html', key: 'officer' });
  }

  const roleLabels = { admin: 'Grievance Officer', officer: 'Grievance Resolver', student: 'Student' };
  const rightSide = user
    ? `<span class="muted">Signed in as <b>${escapeHtml(user.name)}</b> (${roleLabels[user.role] || user.role})</span>
       <button class="btn small outline" onclick="logout()">Logout</button>`
    : `<a class="btn outline small" href="login.html">Login</a>
       <a class="btn small" href="signup.html">Sign up</a>`;

  root.innerHTML = `
    <nav class="nav">
      <div class="nav-inner">
        <a class="brand" href="index.html">
          <span class="logo"></span>
          <span>Grievance Desk</span>
        </a>
        <div class="nav-links">
          ${links.map((l) => `<a class="${l.key === active ? 'active' : ''}" href="${l.href}">${l.label}</a>`).join('')}
          ${rightSide}
        </div>
      </div>
    </nav>
  `;
}

async function logout() {
  try { await api.post('/auth/logout'); } catch (_e) { /* ignore */ }
  api.clearSession();
  location.href = 'index.html';
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function statusChip(status) {
  const label = status.replace('_', ' ');
  return `<span class="chip ${status}">${label}</span>`;
}

function priorityChip(p) {
  return `<span class="chip ${p}">${p}</span>`;
}

/** Require a user of one of the given roles, else redirect to login. */
function requireRole(...roles) {
  const u = api.getUser();
  if (!u) { location.href = 'login.html'; return null; }
  if (roles.length && !roles.includes(u.role)) {
    location.href = 'dashboard.html';
    return null;
  }
  return u;
}

function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

window.renderNav = renderNav;
window.logout = logout;
window.escapeHtml = escapeHtml;
window.statusChip = statusChip;
window.priorityChip = priorityChip;
window.requireRole = requireRole;
window.fmtDate = fmtDate;
