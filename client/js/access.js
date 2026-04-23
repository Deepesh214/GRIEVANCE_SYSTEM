/* Access management page - Grievance Officer only. */
var ORIGIN = (window.__API_BASE__ || 'http://localhost:5000/api').replace(/\/api$/, '');

document.addEventListener('DOMContentLoaded', async function () {
  if (!requireRole('admin')) return;
  renderNav();
  await Promise.all([loadUsers(), loadInvites()]);

  document.getElementById('invite-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var form = e.currentTarget;
    var btn = document.getElementById('invite-btn');
    var result = document.getElementById('invite-result');
    result.innerHTML = '';
    btn.disabled = true; btn.textContent = 'Sending...';
    try {
      var body = Object.fromEntries(new FormData(form));
      var out = await api.post('/admin/invites', body);
      result.innerHTML = '<div class="alert success">' +
        'Invite created! Signup link (also emailed):<br>' +
        '<code style="word-break:break-all;">' + escapeHtml(out.link) + '</code>' +
        ' <button class="btn small outline" type="button" onclick="copyLink(\'' + escapeHtml(out.link) + '\')">Copy</button>' +
        '</div>';
      form.reset();
      await loadInvites();
    } catch (err) {
      result.innerHTML = '<div class="alert error">' + escapeHtml(err.message) + '</div>';
    } finally {
      btn.disabled = false; btn.textContent = 'Send invite';
    }
  });
});

function copyLink(link) {
  navigator.clipboard.writeText(link).then(function () { alert('Link copied.'); });
}
window.copyLink = copyLink;

var roleLabel = { admin: 'Grievance Officer', officer: 'Grievance Resolver', student: 'Student' };

async function loadUsers() {
  var el = document.getElementById('user-list');
  try {
    var out = await api.get('/admin/users');
    if (!out.users.length) { el.innerHTML = '<p class="muted">No users yet.</p>'; return; }
    el.innerHTML = '<table><thead><tr>' +
      '<th>Name</th><th>Role</th><th>Email</th><th>Phone</th><th>College ID</th><th>Dept</th>' +
      '<th>Status</th><th>Joined</th><th></th></tr></thead><tbody>' +
      out.users.map(function (u) {
        return '<tr>' +
          '<td>' + escapeHtml(u.name) + '</td>' +
          '<td>' + escapeHtml(roleLabel[u.role] || u.role) + '</td>' +
          '<td>' + escapeHtml(u.email) + '</td>' +
          '<td>' + escapeHtml(u.phone || '-') + '</td>' +
          '<td>' + escapeHtml(u.collegeId || '-') + '</td>' +
          '<td>' + escapeHtml(u.department || '-') + '</td>' +
          '<td>' + (u.isActive ? '<span class="chip resolved">active</span>' : '<span class="chip rejected">disabled</span>') + '</td>' +
          '<td>' + fmtDate(u.createdAt) + '</td>' +
          '<td><button class="btn small outline" data-uid="' + u._id + '" data-active="' + (u.isActive ? '0' : '1') + '">' +
            (u.isActive ? 'Disable' : 'Enable') + '</button></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';

    var buttons = el.querySelectorAll('button[data-uid]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', async function (e) {
        var uid = e.currentTarget.getAttribute('data-uid');
        var next = e.currentTarget.getAttribute('data-active') === '1';
        try {
          await api.request ? undefined : null;
          await fetch((window.__API_BASE__ || 'http://localhost:5000/api') + '/admin/users/' + uid + '/active', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + api.getToken() },
            body: JSON.stringify({ isActive: next }),
          }).then(function (r) { return r.json(); }).then(function (data) {
            if (!data.success) throw new Error(data.message || 'Failed');
          });
          await loadUsers();
        } catch (err) { alert(err.message); }
      });
    }
  } catch (err) {
    el.innerHTML = '<div class="alert error">' + escapeHtml(err.message) + '</div>';
  }
}

async function loadInvites() {
  var el = document.getElementById('pending-invites');
  try {
    var out = await api.get('/admin/invites');
    if (!out.invites.length) { el.innerHTML = '<p class="muted">No invites yet.</p>'; return; }
    el.innerHTML = '<table><thead><tr>' +
      '<th>Email</th><th>Role</th><th>Status</th><th>Expires</th><th></th>' +
      '</tr></thead><tbody>' +
      out.invites.map(function (inv) {
        var status = inv.usedAt ? '<span class="chip resolved">used</span>'
          : (new Date(inv.expiresAt) < new Date() ? '<span class="chip rejected">expired</span>'
          : '<span class="chip pending">pending</span>');
        var linkBtn = (!inv.usedAt && new Date(inv.expiresAt) > new Date())
          ? '<button class="btn small outline" data-copy="' + ORIGIN + '/signup.html?invite=' + inv.token + '">Copy link</button> ' +
            '<button class="btn small danger" data-revoke="' + inv._id + '">Revoke</button>'
          : '';
        return '<tr>' +
          '<td>' + escapeHtml(inv.email) + '</td>' +
          '<td>' + escapeHtml(roleLabel[inv.role] || inv.role) + '</td>' +
          '<td>' + status + '</td>' +
          '<td>' + fmtDate(inv.expiresAt) + '</td>' +
          '<td>' + linkBtn + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';

    el.querySelectorAll('button[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        navigator.clipboard.writeText(b.getAttribute('data-copy'));
        b.textContent = 'Copied';
        setTimeout(function () { b.textContent = 'Copy link'; }, 1500);
      });
    });
    el.querySelectorAll('button[data-revoke]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!confirm('Revoke this invite?')) return;
        try {
          await fetch((window.__API_BASE__ || 'http://localhost:5000/api') + '/admin/invites/' + b.getAttribute('data-revoke'), {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + api.getToken() },
          }).then(function (r) { return r.json(); });
          await loadInvites();
        } catch (err) { alert(err.message); }
      });
    });
  } catch (err) {
    el.innerHTML = '<div class="alert error">' + escapeHtml(err.message) + '</div>';
  }
}
// padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding
