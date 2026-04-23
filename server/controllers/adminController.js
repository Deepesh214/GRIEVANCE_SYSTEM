/**
 * Admin controller (Supabase).
 */
const grievances = require('../repos/grievancesRepo');
const usersRepo = require('../repos/usersRepo');
const { notify } = require('../utils/emailService');
const { Parser } = require('json2csv');

function parseFilters(q) {
  const f = {};
  if (q.status) f.status = q.status;
  if (q.category) f.category = q.category;
  if (q.priority) f.priority = q.priority;
  if (q.assignedTo) f.assignedTo = q.assignedTo;
  if (q.unassigned === 'true') f.unassigned = true;
  if (q.from) f.from = q.from;
  if (q.to) f.to = q.to;
  if (q.q) f.q = String(q.q).replace(/[%_]/g, '');
  return f;
}

// GET /api/admin/grievances
exports.listAll = async (req, res, next) => {
  try {
    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const { rows, total } = await grievances.listAll(parseFilters(req.query), page, limit);
    res.json({ success: true, page, limit, total, grievances: rows });
  } catch (err) { next(err); }
};

// POST /api/admin/grievances/:id/assign
exports.assignOfficer = async (req, res, next) => {
  try {
    const g = await grievances.findById(req.params.id);
    if (!g) { const e = new Error('Grievance not found'); e.status = 404; throw e; }
    const officer = await usersRepo.findById(req.body.officerId);
    if (!officer || officer.role !== 'officer' || !officer.is_active) {
      const e = new Error('Officer not found or inactive'); e.status = 400; throw e;
    }
    const prevAssigned = g.assignedTo ? g.assignedTo.id : null;
    const patch = { assignedTo: officer.id };
    if (g.status === 'pending') patch.status = 'in_progress';
    await grievances.updateFields(g.id, patch);
    await grievances.addHistory(g.id, {
      by: req.user.id, byName: req.user.name, byRole: 'admin',
      action: 'assigned', from: prevAssigned, to: officer.id,
      note: 'Assigned to ' + officer.name,
    });

    notify({ user: { id: officer.id, email: officer.email }, grievance: g, type: 'grievance_assigned',
      title: 'New assignment: ' + g.title,
      message: 'You have been assigned a ' + g.category + ' grievance. Please review and update status.' });
    if (g.raisedBy && g.raisedBy.id) {
      notify({ user: { id: g.raisedBy.id, email: g.raisedBy.email }, grievance: g, type: 'grievance_assigned',
        title: 'Your grievance is in progress',
        message: 'Your grievance "' + g.title + '" has been assigned to ' + officer.name + '.' });
    }
    const updated = await grievances.findById(g.id);
    res.json({ success: true, grievance: updated });
  } catch (err) { next(err); }
};

// POST /api/admin/grievances/:id/notes
exports.addInternalNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note || !String(note).trim()) { const e = new Error('Note required'); e.status = 400; throw e; }
    const g = await grievances.findById(req.params.id);
    if (!g) { const e = new Error('Grievance not found'); e.status = 404; throw e; }
    await grievances.addNote(g.id, { by: req.user.id, byName: req.user.name, note });
    await grievances.addHistory(g.id, {
      by: req.user.id, byName: req.user.name, byRole: req.user.role,
      action: 'note', note: '(internal) ' + note,
    });
    const updated = await grievances.findById(g.id);
    res.json({ success: true, grievance: updated });
  } catch (err) { next(err); }
};

// POST /api/admin/grievances/:id/resolve
exports.resolve = async (req, res, next) => {
  try {
    const summary = req.body.summary || 'Resolved by admin';
    const g = await grievances.findById(req.params.id);
    if (!g) { const e = new Error('Grievance not found'); e.status = 404; throw e; }
    const prev = g.status;
    await grievances.updateFields(g.id, { status: 'resolved', resolvedAt: new Date().toISOString(), resolutionSummary: summary });
    await grievances.addHistory(g.id, {
      by: req.user.id, byName: req.user.name, byRole: req.user.role,
      action: 'resolved', from: prev, to: 'resolved', note: summary,
    });
    if (g.raisedBy && g.raisedBy.id) {
      notify({ user: { id: g.raisedBy.id, email: g.raisedBy.email }, grievance: g,
        type: 'grievance_resolved', title: 'Resolved: ' + g.title,
        message: 'Your grievance has been resolved. ' + summary });
    }
    const updated = await grievances.findById(g.id);
    res.json({ success: true, grievance: updated });
  } catch (err) { next(err); }
};

// POST /api/admin/grievances/:id/attachments
exports.uploadEvidence = async (req, res, next) => {
  try {
    const g = await grievances.findById(req.params.id);
    if (!g) { const e = new Error('Grievance not found'); e.status = 404; throw e; }
    const atts = (req.uploadedFiles || []).map(f => ({
      filename: f.filename, originalName: f.originalname, mimetype: f.mimetype, size: f.size, url: f.url,
    }));
    if (atts.length) {
      await grievances.addAttachments(g.id, 'evidence', atts);
      await grievances.addHistory(g.id, {
        by: req.user.id, byName: req.user.name, byRole: req.user.role,
        action: 'evidence_added', note: atts.length + ' file(s) uploaded',
      });
    }
    const updated = await grievances.findById(g.id);
    res.json({ success: true, grievance: updated });
  } catch (err) { next(err); }
};

// GET /api/admin/officers
exports.listOfficers = async (_req, res, next) => {
  try {
    const rows = await usersRepo.listByRole('officer');
    const officers = rows.map(o => ({ _id: o.id, id: o.id, name: o.name, email: o.email, department: o.department }));
    res.json({ success: true, officers });
  } catch (err) { next(err); }
};

// GET /api/admin/analytics/summary
exports.analyticsSummary = async (_req, res, next) => {
  try {
    const total      = await grievances.countAll();
    const byStatus   = await grievances.countBy('status');
    const byCategory = await grievances.countBy('category');
    const byPriority = await grievances.countBy('priority');
    const resolved   = await grievances.resolvedForTiming();
    let avgMs = 0;
    if (resolved.length) {
      avgMs = resolved.reduce((s, r) => s + (new Date(r.resolved_at) - new Date(r.created_at)), 0) / resolved.length;
    }
    res.json({
      success: true, total,
      byStatus, byCategory, byPriority,
      avgResolutionHours: +(avgMs / (1000 * 60 * 60)).toFixed(2),
      resolvedCount: resolved.length,
    });
  } catch (err) { next(err); }
};

// GET /api/admin/export.csv
exports.exportCsv = async (req, res, next) => {
  try {
    const { rows } = await grievances.listAll(parseFilters(req.query), 1, 1000);
    const flat = rows.map(g => ({
      id: g._id, title: g.title, category: g.category, status: g.status, priority: g.priority,
      raisedBy: g.raisedBy ? g.raisedBy.name + ' <' + g.raisedBy.email + '>' : '',
      collegeId: g.raisedBy ? g.raisedBy.collegeId : '',
      assignedTo: g.assignedTo ? g.assignedTo.name + ' <' + g.assignedTo.email + '>' : '',
      createdAt: g.createdAt, resolvedAt: g.resolvedAt || '', resolutionSummary: g.resolutionSummary || '',
    }));
    const csv = new Parser().parse(flat);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="grievances.csv"');
    res.send(csv);
  } catch (err) { next(err); }
};
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
