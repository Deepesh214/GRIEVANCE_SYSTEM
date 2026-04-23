#!/usr/bin/env node
/**
 * End-to-end test for the Grievance Redressal system.
 *
 * Usage:
 *   1. Start the server in another terminal:  npm run dev
 *   2. In this terminal:                      node test-e2e.js
 *
 * The script talks to the running API (no mocks). It:
 *   1. Logs in as Grievance Officer (admin), Grievance Resolver (officer) and Student
 *      using the 3 hardcoded accounts that always exist.
 *   2. Student raises a grievance WITH a real file attachment.
 *   3. Admin sees it on the admin listing, assigns it to the Grievance Resolver.
 *   4. Resolver sees it in their queue, updates status to "in_progress" with a
 *      note, uploads a PDF evidence file.
 *   5. Resolver marks the grievance as "resolved" with a summary.
 *   6. Student refreshes and sees the timeline containing all the steps above.
 *   7. Admin invites a brand-new "grievance.resolver.new@college.edu" as a
 *      Grievance Resolver. Script prints the signup link so you can follow it.
 *
 * Everything is validated with assertions and the script exits non-zero on
 * the first failure so it's CI-friendly.
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:5000/api';

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
  console.log('[OK]  ', msg);
}

async function req(method, endpoint, { token, body, formData } = {}) {
  const opts = { method, headers: {} };
  if (token) opts.headers.Authorization = 'Bearer ' + token;
  if (formData) {
    opts.body = formData;
    // fetch() sets the correct multipart content-type automatically
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + endpoint, opts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ' ' + endpoint + ' -> ' + (data && data.message ? data.message : data));
  }
  return data;
}

async function login(email, password) {
  const out = await req('POST', '/auth/login', { body: { email, password } });
  return { token: out.token, user: out.user };
}

function makeDummyFile(fname, contents) {
  const p = path.join(__dirname, fname);
  fs.writeFileSync(p, contents);
  return p;
}

(async function main() {
  console.log('\n=== Grievance Redressal E2E test ===');
  console.log('API base:', BASE);

  // 1. LOGINS
  const admin   = await login('admin@college.edu',   'admin123');
  const officer = await login('officer@college.edu', 'officer123');
  const student = await login('student@college.edu', 'student123');
  assert(admin.user.role === 'admin', 'admin login has role=admin');
  assert(officer.user.role === 'officer', 'officer login has role=officer');
  assert(student.user.role === 'student', 'student login has role=student');
  assert(admin.user.phone && officer.user.phone && student.user.phone, 'all three demo users have a phone stored');

  // 2. STUDENT raises a grievance with a file attachment
  const evidencePath = makeDummyFile('e2e-dummy-image.txt',
    'Pretend this is a photo of a broken projector. Filed by E2E test at ' + new Date().toISOString());
  const fd = new FormData();
  fd.append('title', 'Projector broken in CS-101');
  fd.append('category', 'Infrastructure');
  fd.append('description', 'The projector in CS-101 has not worked for two days. E2E-TEST');
  fd.append('priority', 'high');
  fd.append('attachments', new Blob([fs.readFileSync(evidencePath)], { type: 'text/plain' }), 'projector-photo.txt');

  const created = await req('POST', '/grievances', { token: student.token, formData: fd });
  const gid = created.grievance._id;
  assert(gid, 'student created a grievance (id=' + gid + ')');
  assert(created.grievance.attachments && created.grievance.attachments.length === 1, 'file attachment saved');

  // 3. ADMIN sees the grievance and assigns it to the Grievance Resolver
  const listed = await req('GET', '/admin/grievances', { token: admin.token });
  const found = listed.grievances.find(function (g) { return g._id === gid; });
  assert(found, 'admin can see the new grievance in their listing');

  await req('POST', '/admin/grievances/' + gid + '/assign',
    { token: admin.token, body: { officerId: officer.user._id } });
  assert(true, 'admin assigned the grievance to the Grievance Resolver');

  // 4. RESOLVER sees it in their queue
  const queue = await req('GET', '/officer/grievances', { token: officer.token });
  const inQueue = queue.grievances.find(function (g) { return g._id === gid; });
  assert(inQueue, 'Grievance Resolver sees the assigned grievance in their queue');
  assert(inQueue.status === 'in_progress', 'status is in_progress after assignment');

  // 5. RESOLVER uploads evidence + updates status
  const evFd = new FormData();
  evFd.append('files', new Blob([Buffer.from('%PDF-1.4 fake pdf body', 'utf8')], { type: 'application/pdf' }), 'site-visit-report.pdf');
  await req('POST', '/officer/grievances/' + gid + '/evidence', { token: officer.token, formData: evFd });
  assert(true, 'Grievance Resolver uploaded evidence PDF');

  await req('POST', '/officer/grievances/' + gid + '/status',
    { token: officer.token, body: { status: 'awaiting_input', note: 'Please confirm the room number.' } });
  assert(true, 'Grievance Resolver flipped status to awaiting_input');

  // 6. STUDENT replies, which bounces status back to in_progress
  await req('POST', '/grievances/' + gid + '/comment',
    { token: student.token, body: { note: 'Room is CS-101 in Block A. Confirmed.' } });
  assert(true, 'student replied with the requested info');

  // 7. RESOLVER marks it resolved
  await req('POST', '/officer/grievances/' + gid + '/status',
    { token: officer.token, body: { status: 'resolved', note: 'New projector installed; tested.' } });
  assert(true, 'Grievance Resolver resolved the grievance');

  // 8. STUDENT fetches the final grievance and checks the timeline
  const final = await req('GET', '/grievances/' + gid, { token: student.token });
  const g = final.grievance;
  assert(g.status === 'resolved', 'final status is resolved');
  assert(g.evidence && g.evidence.length >= 1, 'evidence file is visible to student');
  assert(g.history && g.history.length >= 5, 'timeline contains all steps (len=' + g.history.length + ')');

  console.log('\n--- timeline (most recent first) ---');
  g.history.slice().reverse().forEach(function (h) {
    console.log('  ' + new Date(h.at).toISOString() + ' | ' + (h.byRole || '?') + ' | ' + h.action + (h.note ? ' | ' + h.note : ''));
  });

  // 9. ADMIN invites a new Grievance Resolver
  const invitedEmail = 'grievance.resolver.new+' + Date.now() + '@college.edu';
  const inv = await req('POST', '/admin/invites', {
    token: admin.token,
    body: { email: invitedEmail, phone: '+91 9000099000', role: 'officer' },
  });
  assert(inv.link && inv.link.includes('invite='), 'admin generated an invite link for a new Grievance Resolver');
  console.log('\n-- INVITE LINK (also emailed into logs/emails.log) --');
  console.log('  ' + inv.link);

  // 10. Invitee completes signup via the invite token
  const token = inv.invite.token;
  const accept = await req('POST', '/auth/accept-invite', {
    body: {
      token,
      name: 'New Resolver',
      collegeId: 'NEW-RES-' + Date.now(),
      password: 'newresolver123',
      phone: '+91 9111122233',
      department: 'Maintenance',
    },
  });
  assert(accept.user.role === 'officer', 'invite signup produces a Grievance Resolver account');

  // Cleanup
  try { fs.unlinkSync(evidencePath); } catch (_e) {}

  console.log('\nAll steps passed. Check server/logs/emails.log to see the mock notification trail.\n');
})().catch(function (err) {
  console.error('\n[ABORT]', err.stack || err.message);
  process.exit(1);
});

// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
