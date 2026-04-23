/**
 * Grievance Redressal Management System - API entry point.
 * Works as a long-running Node server locally AND as a Vercel serverless
 * function. Data layer is Supabase/Postgres.
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { ensureHardcodedUsers } = require('./config/hardcodedUsers');
const errorMiddleware = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const grievanceRoutes = require('./routes/grievanceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const officerRoutes = require('./routes/officerRoutes');
const publicRoutes = require('./routes/publicRoutes');

const isVercel = !!process.env.VERCEL;
const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));
if (!isVercel) app.use(morgan('dev'));

// On Vercel ensure the 3 demo accounts exist on the first request after a cold start.
if (isVercel) {
  app.use(async function (_req, _res, next) {
    try {
      if (!global.__HARDCODED_READY__) {
        await ensureHardcodedUsers();
        global.__HARDCODED_READY__ = true;
      }
      next();
    } catch (err) { next(err); }
  });
}

app.get('/api/health', function (_req, res) {
  res.json({ status: 'ok', service: 'grievance-api', runtime: isVercel ? 'vercel' : 'node', time: new Date().toISOString() });
});
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/officer', officerRoutes);

// Serve static client locally (Vercel handles statics via vercel.json)
if (!isVercel) {
  const clientDir = path.join(__dirname, '..', 'client');
  if (fs.existsSync(clientDir)) {
    app.use(express.static(clientDir));
    app.get(/^\/(?!api).*/, function (_req, res, next) {
      const indexFile = path.join(clientDir, 'index.html');
      if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
      next();
    });
  }
}

app.use(function (req, res) {
  res.status(404).json({ success: false, message: 'Route not found: ' + req.method + ' ' + req.originalUrl });
});
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
if (!isVercel) {
  (async function boot() {
    try { await ensureHardcodedUsers(); }
    catch (err) { console.warn('[boot] ensureHardcodedUsers failed: ' + err.message); }
    app.listen(PORT, function () {
      console.log('[boot] Grievance API listening on http://localhost:' + PORT);
    });
  })();
}

module.exports = app;
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
