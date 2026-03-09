const mongoose = require('mongoose');

const scheduleChangeRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    currentSchedule: {
      type: String,
      trim: true,
      default: '',
    },
    currentRoom: {
      type: String,
      trim: true,
      default: '',
    },
    requestedSchedule: {
      type: String,
      trim: true,
      default: '',
    },
    requestedRoom: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNote: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScheduleChangeRequest', scheduleChangeRequestSchema);

