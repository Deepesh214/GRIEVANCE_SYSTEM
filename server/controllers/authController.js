/**
 * Auth controller (Supabase flavor). Same endpoints as before - now using the
 * usersRepo + invitesRepo instead of Mongoose.
 */
const usersRepo = require('../repos/usersRepo');
const invitesRepo = require('../repos/invitesRepo');
const { signToken } = require('../utils/jwt');

function bootstrapRole(email) {
  const e = String(email || '').toLowerCase().trim();
  const adminList = (process.env.ADMIN_EMAILS || '')
    .split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  const officerList = (process.env.OFFICER_EMAILS || '')
    .split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (adminList.includes(e)) return 'admin';
  if (officerList.includes(e)) return 'officer';
  return null;
}

// POST /api/auth/signup - always creates a STUDENT (unless email is in the
// bootstrap allowlist, which lets the very first admin in).
exports.signup = async (req, res, next) => {
  try {
    const role = bootstrapRole(req.body.email) || 'student';
    const u = await usersRepo.create({ ...req.body, role });
    const token = signToken({ id: u.id, role: u.role });
    res.status(201).json({ success: true, message: 'Account created', token, user: usersRepo.toSafe(u) });
  } catch (err) { next(err); }
};

// POST /api/auth/accept-invite  { token, name, collegeId, password, phone, department }
exports.acceptInvite = async (req, res, next) => {
  try {
    const { token, name, collegeId, password, phone, department } = req.body;
    if (!token) { const e = new Error('invite token required'); e.status = 400; throw e; }
    const inv = await invitesRepo.findByToken(token);
    if (!inv) { const e = new Error('Invalid invite token'); e.status = 404; throw e; }
    if (!invitesRepo.isValid(inv)) {
      const e = new Error(inv.usedAt ? 'Invite already used' : 'Invite expired'); e.status = 410; throw e;
    }
    const existing = await usersRepo.findByEmail(inv.email);
    if (existing) { const e = new Error('An account for this email already exists'); e.status = 409; throw e; }

    const u = await usersRepo.create({
      name, email: inv.email, collegeId, password,
      phone: phone || inv.phone, department, role: inv.role,
    });
    await invitesRepo.markUsed(inv.id, u.id);
    const jwt = signToken({ id: u.id, role: u.role });
    res.status(201).json({ success: true, message: 'Account created', token: jwt, user: usersRepo.toSafe(u) });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const u = await usersRepo.findByEmail(email, true);
    if (!u) { const e = new Error('Invalid email or password'); e.status = 401; throw e; }
    const ok = await usersRepo.comparePassword(password, u.password);
    if (!ok) { const e = new Error('Invalid email or password'); e.status = 401; throw e; }
    if (!u.is_active) { const e = new Error('Account has been disabled'); e.status = 403; throw e; }
    const token = signToken({ id: u.id, role: u.role });
    res.json({ success: true, message: 'Logged in', token, user: usersRepo.toSafe(u) });
  } catch (err) { next(err); }
};

exports.me = (req, res) => res.json({ success: true, user: req.user });
exports.logout = (_req, res) => res.json({ success: true, message: 'Logged out' });
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
