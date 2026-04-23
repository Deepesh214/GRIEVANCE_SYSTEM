const router = require('express').Router();
const grievances = require('../repos/grievancesRepo');

router.get('/stats', async (_req, res, next) => {
  try { res.json(Object.assign({ success: true }, await grievances.publicStats())); }
  catch (err) { next(err); }
});

router.get('/trending', async (_req, res, next) => {
  try { res.json(Object.assign({ success: true }, await grievances.trending())); }
  catch (err) { next(err); }
});

module.exports = router;
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
