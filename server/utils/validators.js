/**
 * Reusable express-validator chains.
 * Kept small and declarative so route files stay readable.
 */
const { body } = require('express-validator');

const signupValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('collegeId').trim().notEmpty().withMessage('College ID is required').isLength({ min: 3, max: 40 }),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('department').optional().trim().isLength({ max: 100 }),
  body('phone').trim().isLength({ min: 7, max: 20 }).withMessage('Phone number is required (7-20 chars)'),
];

const loginValidator = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const grievanceValidator = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 140 }),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('description').trim().isLength({ min: 10, max: 4000 }).withMessage('Description must be 10–4000 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
];

const statusUpdateValidator = [
  body('status').isIn(['pending', 'in_progress', 'awaiting_input', 'resolved', 'rejected']).withMessage('Invalid status'),
  body('note').optional().isLength({ max: 1000 }),
];

module.exports = { signupValidator, loginValidator, grievanceValidator, statusUpdateValidator };
