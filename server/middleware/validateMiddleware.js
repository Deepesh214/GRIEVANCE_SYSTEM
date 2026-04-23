/**
 * Pipe the result of an express-validator chain into a 400 response
 * with a clean shape: { success:false, message, errors:[...] }.
 */
const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
}

module.exports = validate;
