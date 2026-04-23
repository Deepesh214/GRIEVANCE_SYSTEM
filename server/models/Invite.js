/**
 * Invite model
 * -------------
 * A Grievance Officer (admin) can invite a specific email to become a
 * Grievance Officer or Grievance Resolver. The invite has a cryptographic
 * token and an expiry. The signup page accepts `?invite=TOKEN` to let the
 * invitee create their account with the embedded role.
 */
const mongoose = require('mongoose');
const crypto = require('crypto');

const inviteSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['admin', 'officer'], required: true },
    token: { type: String, required: true, unique: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: String,
    expiresAt: { type: Date, required: true },
    usedAt: Date,
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

inviteSchema.statics.generateToken = function genToken() {
  return crypto.randomBytes(24).toString('hex');
};

inviteSchema.methods.isValid = function isValid() {
  return !this.usedAt && this.expiresAt && this.expiresAt > new Date();
};

module.exports = mongoose.model('Invite', inviteSchema);
// pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad
// pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad
