/**
 * Centralized error handler. Normalises common error shapes so the
 * frontend can always read `message`.
 */
function errorMiddleware(err, req, res, _next) {
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired, please log in again' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: 'Upload error: ' + err.message });
  }
  // Postgres unique violation coming back from supabase-js
  if (err && (err.code === '23505' || (err.message && err.message.indexOf('duplicate key value') !== -1))) {
    return res.status(409).json({ success: false, message: 'Value already in use (email or ID may be taken)' });
  }

  const status = err.status || err.statusCode || 500;
  if (process.env.NODE_ENV !== 'test') {
    console.error('[error] ' + status + ' ' + (err.message || ''));
    if (status >= 500) console.error(err.stack);
  }
  res.status(status).json({ success: false, message: err.message || 'Internal server error' });
}

module.exports = errorMiddleware;
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
