/**
 * MongoDB connection helper.
 * --------------------------
 * On a long-running Node server we open a connection once at boot.
 * On Vercel (and other serverless platforms) each cold start re-runs this
 * module, so we cache the connection promise on `global` so warm
 * invocations reuse the same socket instead of opening a new one per request.
 */
const mongoose = require('mongoose');

const LOCAL_FALLBACK = 'mongodb://localhost:27017/grievance';

function resolveUri() {
  return process.env.MONGO_URI && process.env.MONGO_URI.trim().length > 0
    ? process.env.MONGO_URI
    : LOCAL_FALLBACK;
}

async function connectDB() {
  const uri = resolveUri();

  // Reuse an in-flight or completed connection across warm serverless invocations.
  if (global.__MONGO_CONN_PROMISE__) return global.__MONGO_CONN_PROMISE__;

  global.__MONGO_CONN_PROMISE__ = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 10,
  }).then(function (c) {
    var masked = uri.replace(/:\/\/([^@]+)@/, '://***@');
    console.log('[db] Connected -> ' + masked);
    return c;
  }).catch(function (err) {
    // Clear the failed promise so the next invocation can retry.
    global.__MONGO_CONN_PROMISE__ = null;
    throw err;
  });

  return global.__MONGO_CONN_PROMISE__;
}

mongoose.connection.on('disconnected', function () { console.warn('[db] disconnected'); });
mongoose.connection.on('reconnected', function () { console.log('[db] reconnected'); });

module.exports = connectDB;
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
