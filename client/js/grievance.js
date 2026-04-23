/**
 * Grievance detail page — shows the full record and timeline.
 * Actions visible depend on the viewer's role.
 */
const UPLOAD_HOST = (window.__API_BASE__ || 'http://localhost:5000/api').replace(/\/api$/, '');

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireRole();
  if (!user) return;
  renderNav();

  const id = new URLSearchParams(location.search).get('id');
  const root = document.getElementById('content');
  if (!id) { root.innerHTML = '<div class="alert error">Missing grievance id.</div>'; return; }

  try {
    await render(id, user, root);
  } catch (err) {
    root.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
});

async function render(id, user, root) {
  const out = await api.get(`/grievances/${id}`);
  const g = out.grievance;

  const isOwner = g.raisedBy && String(g.raisedBy._id) === String(user.id || user._id);
  const isAssigned = g.assignedTo && String(g.assignedTo._id) === String(user.id || user._id);

  root.innerHTML = `
    <a href="dashboard.html" class="muted">← Back to dashboard</a>
    <h1 class="page-title mt-2">${escapeHtml(g.title)}</h1>
    <div class="flex wrap mb-2">
      ${statusChip(g.status)} ${priorityChip(g.priority)}
      <span class="muted">· ${escapeHtml(g.category)} · filed ${fmtDate(g.createdAt)}</span>
    </div>

    <div class="grid two">
      <div class="card">
        <h3>Description</h3>
        <p>${escapeHtml(g.description)}</p>

        ${renderAttachments('Attachments from submitter', g.attachments)}
        ${renderAttachments('Evidence / follow-up files', g.evidence)}

        ${g.internalNotes && g.internalNotes.length ? `
          <h3>Internal notes</h3>
          <ul class="timeline">
            ${g.internalNotes.map((n) => `
              <li>
                <div class="when">${fmtDate(n.at)} · ${escapeHtml(n.byName || 'admin')}</div>
                <div>${escapeHtml(n.note)}</div>
              </li>`).join('')}
          </ul>` : ''}

        ${(isOwner && g.status === 'awaiting_input') ? `
          <h3>Officer asked for more info</h3>
          <form id="reply-form" class="form">
            <label>Your reply
              <textarea name="note" required minlength="1" maxlength="1000"></textarea>
            </label>
            <button class="btn" type="submit">Send reply</button>
          </form>
          <div id="reply-alert"></div>
        ` : ''}

        ${isAssigned ? renderOfficerActions(g) : ''}
      </div>

      <div class="card">
        <h3>Details</h3>
        <table>
          <tr><th>ID</th><td><code>${g._id}</code></td></tr>
          <tr><th>Status</th><td>${statusChip(g.status)}</td></tr>
          <tr><th>Priority</th><td>${priorityChip(g.priority)}</td></tr>
          <tr><th>Submitted by</th><td>${escapeHtml(g.raisedBy?.name || '—')} <span class="muted">(${escapeHtml(g.raisedBy?.collegeId || '')})</span></td></tr>
          <tr><th>Assigned to</th><td>${g.assignedTo ? escapeHtml(g.assignedTo.name) : '<span class="muted">Not yet assigned</span>'}</td></tr>
          <tr><th>Created</th><td>${fmtDate(g.createdAt)}</td></tr>
          <tr><th>Resolved</th><td>${g.resolvedAt ? fmtDate(g.resolvedAt) : '<span class="muted">—</span>'}</td></tr>
        </table>
        ${g.resolutionSummary ? `<div class="alert success mt-2"><b>Resolution:</b> ${escapeHtml(g.resolutionSummary)}</div>` : ''}

        <h3 class="mt-3">Timeline</h3>
        <ul class="timeline">
          ${(g.history || []).slice().reverse().map((h) => `
            <li>
              <div class="when">${fmtDate(h.at)} · ${escapeHtml(h.byName || '')} ${h.byRole ? '('+escapeHtml(displayRole(h.byRole))+')' : ''}</div>
              <div>${describeHistory(h)}</div>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;

  /* ---------- Hook up inline forms ---------- */
  const replyForm = document.getElementById('reply-form');
  if (replyForm) {
    replyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById('reply-alert');
      alertBox.innerHTML = '';
      try {
        const body = Object.fromEntries(new FormData(replyForm));
        await api.post(`/grievances/${g._id}/comment`, body);
        alertBox.innerHTML = '<div class="alert success">Reply sent.</div>';
        setTimeout(() => location.reload(), 600);
      } catch (err) {
        alertBox.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
      }
    });
  }

  wireOfficerActions(g);
}

function renderOfficerActions(g) {
  return `
    <h3>Grievance Resolver actions</h3>
    <form class="form" id="status-form">
      <div class="row">
        <label>Update status
          <select name="status">
            <option value="in_progress">In progress</option>
            <option value="awaiting_input">Awaiting input</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label>Note (optional)
          <input name="note" maxlength="1000" />
        </label>
      </div>
      <button class="btn" type="submit">Save status</button>
    </form>
    <form class="form mt-2" id="evidence-form" enctype="multipart/form-data">
      <label>Upload evidence
        <input type="file" name="files" multiple accept="image/*,application/pdf,.doc,.docx,.txt" />
      </label>
      <button class="btn outline" type="submit">Upload files</button>
    </form>
    <div id="officer-alert"></div>
  `;
}

function wireOfficerActions(g) {
  const statusForm = document.getElementById('status-form');
  if (statusForm) {
    statusForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const box = document.getElementById('officer-alert');
      box.innerHTML = '';
      try {
        const body = Object.fromEntries(new FormData(statusForm));
        await api.post(`/officer/grievances/${g._id}/status`, body);
        box.innerHTML = '<div class="alert success">Status updated.</div>';
        setTimeout(() => location.reload(), 500);
      } catch (err) {
        box.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
      }
    });
  }
  const evForm = document.getElementById('evidence-form');
  if (evForm) {
    evForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const box = document.getElementById('officer-alert');
      box.innerHTML = '';
      try {
        const fd = new FormData(evForm);
        await api.upload(`/officer/grievances/${g._id}/evidence`, fd);
        box.innerHTML = '<div class="alert success">Files uploaded.</div>';
        setTimeout(() => location.reload(), 500);
      } catch (err) {
        box.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
      }
    });
  }
}

function renderAttachments(title, list) {
  if (!list || !list.length) return '';
  return `
    <h3>${title}</h3>
    <ul>
      ${list.map((a) => {
        var href = (a.url && a.url.indexOf('data:') === 0) ? a.url : (UPLOAD_HOST + a.url);
        var name = escapeHtml(a.originalName || a.filename || 'file');
        return '<li><a target="_blank" href="' + href + '" download="' + name + '">' + name + '</a> <span class="muted">(' + Math.round((a.size||0)/1024) + ' KB)</span></li>';
      }).join('')}
    </ul>
  `;
}

function displayRole(r) {
  return r === 'admin' ? 'Grievance Officer'
    : r === 'officer' ? 'Grievance Resolver'
    : r === 'student' ? 'Student'
    : r;
}

function describeHistory(h) {
  switch (h.action) {
    case 'created': return 'Grievance submitted.';
    case 'assigned': return `Assigned to a Grievance Resolver. ${h.note ? '— ' + escapeHtml(h.note) : ''}`;
    case 'status_changed': return `Status changed: <b>${escapeHtml(h.from || '—')}</b> → <b>${escapeHtml(h.to)}</b>. ${h.note ? '— ' + escapeHtml(h.note) : ''}`;
    case 'resolved': return `Marked as resolved. ${h.note ? '— ' + escapeHtml(h.note) : ''}`;
    case 'note': return `Note: ${escapeHtml(h.note || '')}`;
    case 'evidence_added': return `Evidence uploaded. ${h.note ? '— ' + escapeHtml(h.note) : ''}`;
    default: return escapeHtml(h.action);
  }
}
