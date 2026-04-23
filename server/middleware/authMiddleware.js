/**
 * Protect (JWT) + role-based access control.
 * Uses the users repo so the underlying storage stays hidden from controllers.
 */
const usersRepo = require('../repos/usersRepo');
const { verifyToken } = require('../utils/jwt');

async function protect(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) { const e = new Error('Not authenticated - missing token'); e.status = 401; throw e; }
    const decoded = verifyToken(token);
    const user = await usersRepo.findById(decoded.id);
    if (!user) { const e = new Error('Account no longer exists'); e.status = 401; throw e; }
    if (!user.is_active) { const e = new Error('Account has been disabled'); e.status = 403; throw e; }
    req.user = {
      _id: user.id, id: user.id,
      name: user.name, email: user.email, phone: user.phone,
      collegeId: user.college_id, role: user.role, department: user.department,
      isActive: user.is_active,
    };
    next();
  } catch (err) { next(err); }
}

function authorize(...allowed) {
  return function (req, _res, next) {
    if (!req.user) { const e = new Error('Not authenticated'); e.status = 401; return next(e); }
    if (!allowed.includes(req.user.role)) {
      const e = new Error('Forbidden - ' + req.user.role + ' cannot access this resource');
      e.status = 403; return next(e);
    }
    next();
  };
}

module.exports = { protect, authorize };
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
