const router = require('express').Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');
const { statusUpdateValidator } = require('../utils/validators');
const c = require('../controllers/officerController');

router.use(protect, authorize('officer'));

router.get('/grievances', c.myQueue);
router.get('/stats', c.stats);
router.post('/grievances/:id/status', statusUpdateValidator, validate, c.updateStatus);
router.post('/grievances/:id/evidence', ...upload('files', 5), c.uploadEvidence);

module.exports = router;
