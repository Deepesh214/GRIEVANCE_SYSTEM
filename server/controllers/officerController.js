/**
 * Officer (Grievance Resolver) controller (Supabase).
 */
const grievances = require('../repos/grievancesRepo');
const { notify } = require('../utils/emailService');

exports.myQueue = async (req, res, next) => {
  try {
    const rows = await grievances.listByAssignee(req.user.id, req.query.status);
    res.json({ success: true, count: rows.length, grievances: rows });
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const g = await grievances.findById(req.params.id);
    if (!g) { const e = new Error('Grievance not found'); e.status = 404; throw e; }
    if (!g.assignedTo || String(g.assignedTo.id) !== String(req.user.id)) {
      const e = new Error('You can only update grievances assigned to you'); e.status = 403; throw e;
    }
    const prev = g.status;
    const patch = { status };
    if (status === 'resolved') {
      patch.resolvedAt = new Date().toISOString();
      patch.resolutionSummary = note || 'Resolved by officer';
    }
    await grievances.updateFields(g.id, patch);
    await grievances.addHistory(g.id, {
      by: req.user.id, byName: req.user.name, byRole: 'officer',
      action: status === 'resolved' ? 'resolved' : 'status_changed',
      from: prev, to: status, note: note || '',
    });
    if (g.raisedBy && g.raisedBy.id) {
      notify({
        user: { id: g.raisedBy.id, email: g.raisedBy.email }, grievance: g,
        type: status === 'resolved' ? 'grievance_resolved' : 'grievance_status',
        title: status === 'resolved' ? 'Resolved: ' + g.title : 'Status updated: ' + g.title,
        message: status === 'resolved'
          ? 'Your grievance has been resolved. ' + (note || '')
          : 'Status is now: ' + status.replace('_', ' ') + (note ? '\nOfficer note: ' + note : ''),
      });
    }
    const updated = await grievances.findById(g.id);
    res.json({ success: true, grievance: updated });
  } catch (err) { next(err); }
};

exports.uploadEvidence = async (req, res, next) => {
  try {
    const g = await grievances.findById(req.params.id);
    if (!g) { const e = new Error('Grievance not found'); e.status = 404; throw e; }
    if (!g.assignedTo || String(g.assignedTo.id) !== String(req.user.id)) {
      const e = new Error('You can only modify grievances assigned to you'); e.status = 403; throw e;
    }
    const atts = (req.uploadedFiles || []).map(f => ({
      filename: f.filename, originalName: f.originalname, mimetype: f.mimetype, size: f.size, url: f.url,
    }));
    if (atts.length) {
      await grievances.addAttachments(g.id, 'evidence', atts);
      await grievances.addHistory(g.id, {
        by: req.user.id, byName: req.user.name, byRole: 'officer',
        action: 'evidence_added', note: atts.length + ' file(s) uploaded',
      });
    }
    const updated = await grievances.findById(g.id);
    res.json({ success: true, grievance: updated });
  } catch (err) { next(err); }
};

exports.stats = async (req, res, next) => {
  try {
    const counts = await grievances.countByStatusForUser(req.user.id);
    res.json({ success: true, counts });
  } catch (err) { next(err); }
};
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
