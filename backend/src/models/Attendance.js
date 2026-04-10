const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Absent'],
      required: true,
    },
    time: {
      type: String,
      default: '-',
      trim: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ user: 1, date: 1 });
attendanceSchema.index({ date: 1, user: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
