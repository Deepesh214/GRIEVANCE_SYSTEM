/**
 * Vercel serverless entrypoint.
 *
 * Vercel auto-discovers any file under /api and turns it into a
 * serverless function. We require the existing Express app (which
 * lives under /server) and export it. Vercel wraps it for us.
 *
 * IMPORTANT for serverless:
 *   - No filesystem persistence across invocations.
 *   - Each cold start re-imports this module. We keep the Mongoose
 *     connection cached on `global` so warm invocations reuse it.
 *   - server.js calls `app.listen()`. That's fine - in the serverless
 *     runtime that listen is effectively ignored; Vercel hands HTTP
 *     requests directly to the exported `app`.
 */
process.env.RUNTIME = process.env.VERCEL ? 'vercel' : (process.env.RUNTIME || 'node');
const app = require('../server/server.js');
module.exports = app;
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
