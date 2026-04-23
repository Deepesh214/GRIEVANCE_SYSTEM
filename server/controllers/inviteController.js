/**
 * Invite + user-access controllers (Supabase).
 */
const invitesRepo = require('../repos/invitesRepo');
const usersRepo = require('../repos/usersRepo');
const { notify } = require('../utils/emailService');

const INVITE_TTL_DAYS = 7;

exports.listUsers = async (_req, res, next) => {
  try {
    const users = (await usersRepo.listAll()).map(usersRepo.toSafe);
    res.json({ success: true, count: users.length, users });
  } catch (err) { next(err); }
};

exports.setUserActive = async (req, res, next) => {
  try {
    const existing = await usersRepo.findById(req.params.id);
    if (!existing) { const e = new Error('User not found'); e.status = 404; throw e; }
    if (String(existing.id) === String(req.user.id)) {
      const e = new Error('You cannot deactivate yourself'); e.status = 400; throw e;
    }
    const updated = await usersRepo.setActive(req.params.id, !!req.body.isActive);
    res.json({ success: true, user: usersRepo.toSafe(updated) });
  } catch (err) { next(err); }
};

exports.createInvite = async (req, res, next) => {
  try {
    const { email, phone, role } = req.body;
    if (!email || !role) { const e = new Error('email and role are required'); e.status = 400; throw e; }
    if (!['admin','officer'].includes(role)) {
      const e = new Error('role must be "admin" or "officer"'); e.status = 400; throw e;
    }
    const existing = await usersRepo.findByEmail(email);
    if (existing) { const e = new Error('A user with that email already exists'); e.status = 409; throw e; }

    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400000).toISOString();
    const inv = await invitesRepo.create({
      email, phone, role,
      createdBy: req.user.id, createdByName: req.user.name, expiresAt,
    });

    const baseUrl = process.env.CLIENT_ORIGIN || 'http://localhost:5000';
    const link = baseUrl + '/signup.html?invite=' + inv.token;
    notify({
      user: { email: inv.email, id: null },
      type: 'grievance_assigned',
      title: 'You are invited to join the Grievance Redressal System',
      message: 'Hi,\n\nYou have been invited by ' + req.user.name + ' to join as a ' +
        (role === 'admin' ? 'Grievance Officer' : 'Grievance Resolver') +
        '.\n\nSignup link (valid ' + INVITE_TTL_DAYS + ' days):\n' + link + '\n\nThank you.',
    });
    res.status(201).json({ success: true, invite: inv, link });
  } catch (err) { next(err); }
};

exports.listInvites = async (_req, res, next) => {
  try {
    const invites = await invitesRepo.listAll();
    res.json({ success: true, count: invites.length, invites });
  } catch (err) { next(err); }
};

exports.revokeInvite = async (req, res, next) => {
  try {
    const invites = await invitesRepo.listAll();
    const inv = invites.find(i => i.id === req.params.id);
    if (!inv) { const e = new Error('Invite not found'); e.status = 404; throw e; }
    if (inv.usedAt) { const e = new Error('Invite has already been used'); e.status = 400; throw e; }
    await invitesRepo.remove(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.validateInvite = async (req, res, next) => {
  try {
    const inv = await invitesRepo.findByToken(req.params.token);
    if (!inv) { const e = new Error('Invalid invite token'); e.status = 404; throw e; }
    if (!invitesRepo.isValid(inv)) {
      const e = new Error(inv.usedAt ? 'Invite already used' : 'Invite expired'); e.status = 410; throw e;
    }
    res.json({
      success: true,
      invite: { email: inv.email, phone: inv.phone, role: inv.role, invitedBy: inv.createdByName, expiresAt: inv.expiresAt },
    });
  } catch (err) { next(err); }
};
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
