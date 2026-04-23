/**
 * Mock email service (Supabase version).
 * Writes to the notifications table (when user.id is known) and logs
 * to stdout. Never throws - notifications are best-effort.
 */
const notifications = require('../repos/notificationsRepo');

function deliver({ to, subject, body }) {
  console.log('\n==== ' + new Date().toISOString() + ' ====');
  console.log('To:      ' + to);
  console.log('Subject: ' + subject);
  console.log(body);
  console.log('====================\n');
}

async function notify({ user, grievance, type, title, message }) {
  if (!user) return;
  if (user.id) {
    try {
      await notifications.create({
        userId: user.id,
        grievanceId: grievance ? (grievance.id || grievance._id) : null,
        type, title, message,
      });
    } catch (err) {
      console.warn('[notify] DB write failed:', err.message);
    }
  }
  if (user.email) deliver({ to: user.email, subject: title, body: message });
}

module.exports = { notify, deliver };
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
