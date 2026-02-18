const Attendance = require('../models/Attendance');
const User = require('../models/User');
const mongoose = require('mongoose');

const trimIfString = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * IoT / Fingerprint device attendance check-in.
 * Called when a student scans their fingerprint at the device.
 * Authentication: X-API-Key header (set IOT_API_KEY in .env)
 *
 * Body: { userId?, email?, webauthnCredentialId?, status?, deviceId? }
 * - userId, email, or webauthnCredentialId: identifies the student (required)
 * - status: 'Present' | 'Late' (default: 'Present')
 * - deviceId: optional device identifier for logging
 */
const recordAttendance = async (req, res) => {
  try {
    const { userId, email, webauthnCredentialId, status = 'Present', deviceId } = req.body;
    const allowedStatuses = ['Present', 'Late'];
    const finalStatus = allowedStatuses.includes(status) ? status : 'Present';

    let user;
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid userId' });
      }
      user = await User.findById(userId);
    } else if (email && trimIfString(email)) {
      user = await User.findOne({
        email: email.toLowerCase().trim(),
        $and: [
          { roles: 'student' },
          { roles: { $nin: ['admin', 'super_admin'] } },
        ],
      });
    } else if (webauthnCredentialId && trimIfString(webauthnCredentialId)) {
      // Find user by WebAuthn credential ID (for fingerprint-based attendance)
      user = await User.findOne({
        webauthnCredentialId: webauthnCredentialId.trim(),
        $and: [
          { roles: 'student' },
          { roles: { $nin: ['admin', 'super_admin'] } },
        ],
      });
    } else {
      return res.status(400).json({
        error: 'Either userId, email, or webauthnCredentialId is required to record attendance',
      });
    }

    if (!user) {
      return res.status(404).json({
        error: 'Student not found. Ensure the user exists and has the student role.',
      });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const existing = await Attendance.findOne({
      user: user._id,
      date: { $gte: todayStart, $lt: todayEnd },
    });

    if (existing) {
      return res.status(409).json({
        error: 'Attendance already recorded for today',
        record: {
          id: existing._id,
          date: existing.date.toISOString().slice(0, 10),
          status: existing.status,
          time: existing.time || '-',
        },
      });
    }

    const timeStr = now.toTimeString().slice(0, 5);
    const record = await Attendance.create({
      user: user._id,
      date: todayStart,
      status: finalStatus,
      time: timeStr,
      note: deviceId ? `Device: ${trimIfString(deviceId)}` : '',
    });

    return res.status(201).json({
      message: 'Attendance recorded',
      record: {
        id: record._id,
        date: record.date.toISOString().slice(0, 10),
        status: record.status,
        time: record.time,
        userId: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('IoT attendance error:', error);
    return res.status(500).json({ error: 'Failed to record attendance' });
  }
};

/**
 * Match fingerprint template to identify user.
 * Called by IoT scanner to identify a student from their fingerprint.
 * Authentication: X-API-Key header (set IOT_API_KEY in .env)
 *
 * Body: { fingerprint } OR { webauthnCredentialId }
 * - fingerprint: fingerprint template data (string, base64 or raw template) - legacy support
 * - webauthnCredentialId: WebAuthn credential ID from phone registration
 *
 * Returns: { userId, email, name, idNumber, webauthnCredentialId } if match found
 */
const matchFingerprint = async (req, res) => {
  try {
    const { fingerprint, webauthnCredentialId } = req.body;

    if (!fingerprint && !webauthnCredentialId) {
      return res.status(400).json({ error: 'Either fingerprint template or webauthnCredentialId is required' });
    }

    let user;
    
    if (webauthnCredentialId && typeof webauthnCredentialId === 'string' && webauthnCredentialId.trim()) {
      // Match by WebAuthn credential ID (from phone registration)
      user = await User.findOne({
        webauthnCredentialId: webauthnCredentialId.trim(),
        $and: [
          { roles: 'student' },
          { roles: { $nin: ['admin', 'super_admin'] } },
        ],
      }).select('_id email name idNumber webauthnCredentialId');
    } else if (fingerprint && typeof fingerprint === 'string' && fingerprint.trim()) {
      // Legacy: Match by fingerprint template (exact match)
      // Note: For production, you may want to implement fuzzy matching or use a fingerprint matching library
      user = await User.findOne({
        fingerprint: fingerprint.trim(),
        $and: [
          { roles: 'student' },
          { roles: { $nin: ['admin', 'super_admin'] } },
        ],
      }).select('_id email name idNumber webauthnCredentialId');
    }

    if (!user) {
      return res.status(404).json({
        error: 'Fingerprint not found. User may not be registered or fingerprint not captured.',
      });
    }

    return res.json({
      userId: user._id,
      email: user.email,
      name: user.name || '',
      idNumber: user.idNumber || '',
      webauthnCredentialId: user.webauthnCredentialId || '',
    });
  } catch (error) {
    console.error('Fingerprint match error:', error);
    return res.status(500).json({ error: 'Failed to match fingerprint' });
  }
};

module.exports = { recordAttendance, matchFingerprint };
