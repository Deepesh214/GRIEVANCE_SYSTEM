/* Landing page - pulls public stats and trending grievances. */
document.addEventListener('DOMContentLoaded', async () => {
  renderNav('home');
  var user = api.getUser();
  if (user) {
    if (user.role !== 'student') document.getElementById('cta-raise').classList.add('hidden');
    if (user.role === 'student') document.getElementById('cta-resolve').classList.add('hidden');
    var roleLogins = document.getElementById('role-logins');
    if (roleLogins) roleLogins.classList.add('hidden');
  }
  try {
    var stats = await api.get('/public/stats');
    document.getElementById('stat-total').textContent = stats.total || 0;
    document.getElementById('stat-resolved').textContent = stats.resolved || 0;
    document.getElementById('stat-pending').textContent = stats.pending || 0;
    document.getElementById('stat-inprogress').textContent = stats.inProgress || 0;
  } catch (err) { console.error(err); }
  try {
    var t = await api.get('/public/trending');
    fillList('list-recent', t.recent, 'createdAt');
    fillList('list-urgent', t.urgent, 'createdAt');
    fillList('list-resolved', t.resolved, 'resolvedAt');
  } catch (err) { console.error(err); }
});

function fillList(listId, arr, dateField) {
  var el = document.getElementById(listId);
  if (!el) return;
  if (!arr || !arr.length) { el.innerHTML = '<li class="muted">Nothing here yet.</li>'; return; }
  var html = '';
  for (var i = 0; i < arr.length; i++) {
    var g = arr[i];
    html += '<li><div class="flex space"><strong>' + escapeHtml(g.title) + '</strong>' + statusChip(g.status) + '</div>';
    html += '<div class="when">' + escapeHtml(g.category) + ' - ' + fmtDate(g[dateField]) + '</div></li>';
  }
  el.innerHTML = html;
}

// ==================== PADDING BLOCK (safe to ignore) ====================
// This padding exists because the sandbox-to-disk bridge can truncate the
// very last few bytes of a written file. The real code ends above this line.
// Padding line 1 ------------------------------------------------------------
// Padding line 2 ------------------------------------------------------------
// Padding line 3 ------------------------------------------------------------
// Padding line 4 ------------------------------------------------------------
// Padding line 5 ------------------------------------------------------------
// End padding --------------------------------------------------------------
