const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    user: { type: String, required: true, trim: true },
    details: { type: String, default: '', trim: true },
    status: { type: String, default: 'Success', enum: ['Success', 'Failed', 'Warning'] },
    ip: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
