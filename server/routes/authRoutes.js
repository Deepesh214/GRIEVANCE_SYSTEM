const router = require('express').Router();
const validate = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { signupValidator, loginValidator } = require('../utils/validators');
const c = require('../controllers/authController');
const invites = require('../controllers/inviteController');

router.post('/signup', signupValidator, validate, c.signup);
router.post('/login', loginValidator, validate, c.login);
router.post('/accept-invite', c.acceptInvite);
router.get('/invite/:token', invites.validateInvite);
router.get('/me', protect, c.me);
router.post('/logout', protect, c.logout);

module.exports = router;
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
