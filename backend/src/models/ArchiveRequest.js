const mongoose = require('mongoose');

const archiveRequestSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    studentBlock: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    status: { type: String, default: 'Pending', enum: ['Pending', 'Reviewed', 'Approved', 'Rejected'] },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ArchiveRequest', archiveRequestSchema);
