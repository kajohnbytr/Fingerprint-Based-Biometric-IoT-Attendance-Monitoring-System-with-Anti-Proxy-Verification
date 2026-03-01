const mongoose = require('mongoose');
const crypto = require('crypto');

const inviteTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ['student'],
      default: 'student',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
    // How many times this invite has been used.
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Maximum number of registrations allowed for this invite.
    maxUses: {
      type: Number,
      default: 50,
      min: 1,
    },
    usedAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

inviteTokenSchema.index({ expiresAt: 1 });

const generateToken = () => crypto.randomBytes(32).toString('hex');

inviteTokenSchema.statics.createInvite = async function (opts = {}) {
  const { email, createdBy, expiresInDays = 7, maxUses = 50 } = opts;
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const doc = await this.create({
    token,
    email: email || null,
    role: 'student',
    expiresAt,
    maxUses: Number.isFinite(maxUses) && maxUses > 0 ? maxUses : 50,
    createdBy,
  });

  return { token: doc.token, expiresAt: doc.expiresAt };
};

module.exports = mongoose.model('InviteToken', inviteTokenSchema);
