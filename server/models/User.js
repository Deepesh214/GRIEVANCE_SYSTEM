/**
 * User model
 * -----------
 * Three roles supported:
 *   - student   (default, raises grievances)
 *   - officer   (assigning officer, resolves grievances)
 *   - admin     (manages everything)
 *
 * `collegeId` is required and unique so that no two accounts can share it.
 * Password is hashed with bcrypt before save and is never sent to the client
 * thanks to `select: false`.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['student', 'officer', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    collegeId: {
      type: String,
      required: [true, 'College ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 40,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned by default
    },
    role: { type: String, enum: ROLES, default: 'student' },
    department: { type: String, trim: true },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      minlength: [7, 'Phone number must be at least 7 digits'],
      maxlength: 20,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password on create / password change.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

// Instance method — compare a plaintext candidate against the stored hash.
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Tidy JSON responses (strip password, __v).
userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema);
