const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    idNumber: {
      type: String,
      trim: true,
      default: '',
    },
    block: {
      type: String,
      trim: true,
      default: '',
    },
    comCourse: {
      type: String,
      trim: true,
      default: '',
    },
    comSchedule: {
      type: String,
      trim: true,
      default: '',
    },
    comRoom: {
      type: String,
      trim: true,
      default: '',
    },
    comCourses: [
      {
        courseName: {
          type: String,
          trim: true,
          default: '',
        },
        schedule: {
          type: String,
          trim: true,
          default: '',
        },
        room: {
          type: String,
          trim: true,
          default: '',
        },
      },
    ],
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    roles: {
      type: [String],
      default: ['admin'],
    },
    fingerprint: {
      type: String,
      default: '',
      trim: true,
    },
    webauthnCredentialId: {
      type: String,
      default: '',
      trim: true,
    },
    webauthnPublicKey: {
      type: String,
      default: '',
      trim: true,
    },
    fingerprintTemplateId: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
