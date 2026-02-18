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
    usedAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

inviteTokenSchema.index({ token: 1 });
inviteTokenSchema.index({ expiresAt: 1 });

const generateToken = () => crypto.randomBytes(32).toString('hex');

inviteTokenSchema.statics.createInvite = async function (opts = {}) {
  const { email, createdBy, expiresInDays = 7 } = opts;
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const doc = await this.create({
    token,
    email: email || null,
    role: 'student',
    expiresAt,
    createdBy,
  });

  return { token: doc.token, expiresAt: doc.expiresAt };
};

module.exports = mongoose.model('InviteToken', inviteTokenSchema);
