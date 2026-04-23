const router = require('express').Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const c = require('../controllers/adminController');
const i = require('../controllers/inviteController');

// All admin routes require a valid admin token.
router.use(protect, authorize('admin'));

// Grievance listing + analytics
router.get('/grievances', c.listAll);
router.get('/analytics/summary', c.analyticsSummary);
router.get('/export.csv', c.exportCsv);

// Officer dropdown
router.get('/officers', c.listOfficers);

// Per-grievance actions
router.post('/grievances/:id/assign', c.assignOfficer);
router.post('/grievances/:id/notes', c.addInternalNote);
router.post('/grievances/:id/resolve', c.resolve);
router.post('/grievances/:id/attachments', ...upload('files', 5), c.uploadEvidence);

// Access management
router.get('/users', i.listUsers);
router.patch('/users/:id/active', i.setUserActive);
router.post('/invites', i.createInvite);
router.get('/invites', i.listInvites);
router.delete('/invites/:id', i.revokeInvite);

module.exports = router;
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
