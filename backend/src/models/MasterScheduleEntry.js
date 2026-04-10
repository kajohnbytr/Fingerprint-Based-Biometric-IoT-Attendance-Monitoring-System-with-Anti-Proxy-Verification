const mongoose = require('mongoose');

const masterScheduleEntrySchema = new mongoose.Schema(
  {
    block: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    schedule: {
      type: String,
      required: true,
      trim: true,
    },
    room: {
      type: String,
      default: '',
      trim: true,
    },
    assignedProfessorEmail: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
      index: true,
    },
    /** null = use system default late tolerance; number = minutes after class start still counted Present */
    graceOverrideMinutes: {
      type: Number,
      default: null,
      min: 0,
      max: 180,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

masterScheduleEntrySchema.index({ block: 1, order: 1 });
masterScheduleEntrySchema.index({ block: 1, courseName: 1, schedule: 1 });

module.exports = mongoose.model('MasterScheduleEntry', masterScheduleEntrySchema);
