/**
 * Student-facing grievance controller.
 * Admin/officer/invite flows live in their own controller files.
 */
const grievances = require('../repos/grievancesRepo');
const usersRepo = require('../repos/usersRepo');
const { notify } = require('../utils/emailService');

function filesToAttachments(list) {
  return (list || []).map(f => ({
    filename: f.filename, originalName: f.originalname,
    mimetype: f.mimetype, size: f.size, url: f.url,
  }));
}

// POST /api/grievances  (multipart)
exports.create = async (req, res, next) => {
  try {
    const id = await grievances.create({
      title: req.body.title, description: req.body.description,
      category: req.body.category, priority: req.body.priority || 'medium',
      status: 'pending', raisedBy: req.user.id,
    });
    const atts = filesToAttachments(req.uploadedFiles);
    if (atts.length) await grievances.addAttachments(id, 'attachment', atts);
    await grievances.addHistory(id, {
      by: req.user.id, byName: req.user.name, byRole: req.user.role,
      action: 'created', to: 'pending', note: 'Grievance submitted',
    });

    const g = await grievances.findById(id);
    // Notifications (best-effort)
    notify({ user: req.user, grievance: g, type: 'grievance_submitted',
      title: 'Grievance received - ' + g.title,
      message: 'Hi ' + req.user.name + ', your grievance has been submitted and is pending review.\nTracking ID: ' + id });
    const admins = await usersRepo.listByRole('admin');
    admins.forEach(a => notify({
      user: { id: a.id, email: a.email }, grievance: g, type: 'grievance_submitted',
      title: 'New grievance: ' + g.title,
      message: req.user.name + ' (' + req.user.collegeId + ') filed a new ' + g.category + ' grievance.'
    }));

    res.status(201).json({ success: true, grievance: g });
  } catch (err) { next(err); }
};

// GET /api/grievances/mine
exports.listMine = async (req, res, next) => {
  try {
    const rows = await grievances.listByUser(req.user.id);
    res.json({ success: true, count: rows.length, grievances: rows });
  } catch (err) { next(err); }
};

// GET /api/grievances/:id
exports.getOne = async (req, res, next) => {
  try {
    const g = await grievances.findById(req.params.id);
    if (!g) { const e = new Error('Grievance not found'); e.status = 404; throw e; }
    const u = req.user;
    const isOwner    = g.raisedBy   && String(g.raisedBy.id)   === String(u.id);
    const isAssigned = g.assignedTo && String(g.assignedTo.id) === String(u.id);
    if (!(isOwner || isAssigned || u.role === 'admin')) {
      const e = new Error('Forbidden - you cannot view this grievance'); e.status = 403; throw e;
    }
    const payload = { ...g };
    if (u.role === 'student') delete payload.internalNotes;
    res.json({ success: true, grievance: payload });
  } catch (err) { next(err); }
};

// POST /api/grievances/:id/comment - student adds a note; if awaiting_input, flip to in_progress
exports.addStudentNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note || !String(note).trim()) { const e = new Error('Note cannot be empty'); e.status = 400; throw e; }
    const g = await grievances.findById(req.params.id);
    if (!g) { const e = new Error('Grievance not found'); e.status = 404; throw e; }
    if (String(g.raisedBy.id) !== String(req.user.id)) {
      const e = new Error('Only the submitter can add a note here'); e.status = 403; throw e;
    }
    await grievances.addHistory(g.id, {
      by: req.user.id, byName: req.user.name, byRole: 'student', action: 'note', note,
    });
    if (g.status === 'awaiting_input') {
      await grievances.updateFields(g.id, { status: 'in_progress' });
      await grievances.addHistory(g.id, {
        by: req.user.id, byName: req.user.name, byRole: 'student',
        action: 'status_changed', from: 'awaiting_input', to: 'in_progress',
        note: 'Student provided requested input',
      });
    }
    if (g.assignedTo && g.assignedTo.id) {
      notify({ user: { id: g.assignedTo.id, email: g.assignedTo.email }, grievance: g,
        type: 'note_added', title: 'Student replied on "' + g.title + '"',
        message: req.user.name + ' added a note: ' + note });
    }
    const updated = await grievances.findById(g.id);
    res.json({ success: true, grievance: updated });
  } catch (err) { next(err); }
};

// GET /api/grievances/categories
exports.categories = (_req, res) => {
  res.json({
    success: true,
    categories: grievances.CATEGORIES,
    statuses: grievances.STATUSES,
    priorities: grievances.PRIORITIES,
  });
};
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
