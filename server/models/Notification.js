/**
 * Notification model — records every notification event for an audit log
 * and to power an optional in-app inbox. The actual "delivery" happens in
 * utils/emailService.js (stubbed by default, writes to logs/emails.log).
 */
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    grievance: { type: mongoose.Schema.Types.ObjectId, ref: 'Grievance' },
    type: {
      type: String,
      enum: ['grievance_submitted', 'grievance_assigned', 'grievance_status', 'grievance_resolved', 'note_added'],
      required: true,
    },
    title: String,
    message: String,
    readAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
