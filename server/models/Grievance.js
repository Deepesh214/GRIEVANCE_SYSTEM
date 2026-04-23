/**
 * Grievance model
 * ----------------
 * - `history` is an append-only log of state transitions and comments.
 *   Every time status/assignment/notes change we push an entry so the
 *   student can see a full timeline.
 * - `attachments` and `evidence` keep filenames + URLs so files can be
 *   served from /uploads (or swapped for Cloudinary URLs later).
 */
const mongoose = require('mongoose');

const CATEGORIES = [
  'Library', 'Academics', 'Hostel', 'Transport',
  'Canteen', 'Infrastructure', 'Faculty', 'Examination',
  'IT', 'Harassment', 'Other',
];

const STATUSES = ['pending', 'in_progress', 'awaiting_input', 'resolved', 'rejected'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const attachmentSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  mimetype: String,
  size: Number,
  url: String,
}, { _id: false });

const historySchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  byName: String,
  byRole: String,
  action: String,   // "created" | "assigned" | "status_changed" | "note" | "evidence_added" | "resolved"
  from: String,     // previous value (e.g. old status)
  to: String,       // new value
  note: String,
}, { _id: false });

const grievanceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    category: { type: String, required: true, enum: CATEGORIES, default: 'Other' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },

    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    attachments: [attachmentSchema],  // uploaded by the student
    evidence: [attachmentSchema],     // uploaded by the officer/admin
    internalNotes: [{
      at: { type: Date, default: Date.now },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      byName: String,
      note: String,
    }],
    history: [historySchema],

    resolvedAt: Date,
    resolutionSummary: String,
  },
  { timestamps: true }
);

// Helper: push a new timeline entry.
grievanceSchema.methods.addHistory = function addHistory(entry) {
  this.history.push({ at: new Date(), ...entry });
};

// Expose allowed values on the model so routes/controllers don't duplicate them.
grievanceSchema.statics.CATEGORIES = CATEGORIES;
grievanceSchema.statics.STATUSES = STATUSES;
grievanceSchema.statics.PRIORITIES = PRIORITIES;

module.exports = mongoose.model('Grievance', grievanceSchema);
