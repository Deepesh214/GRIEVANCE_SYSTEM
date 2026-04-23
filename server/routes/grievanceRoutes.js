const router = require('express').Router();
const validate = require('../middleware/validateMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { grievanceValidator } = require('../utils/validators');
const c = require('../controllers/grievanceController');

router.get('/categories', protect, c.categories);
router.get('/mine', protect, authorize('student'), c.listMine);

router.post('/', protect, authorize('student'),
  ...upload('attachments', 5),
  grievanceValidator, validate, c.create);

router.post('/:id/comment', protect, authorize('student'), c.addStudentNote);
router.get('/:id', protect, c.getOne);

module.exports = router;
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
