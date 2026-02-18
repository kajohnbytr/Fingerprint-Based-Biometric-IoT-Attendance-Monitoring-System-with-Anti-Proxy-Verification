const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Report = require('../models/Report');

const trimIfString = (value) => (typeof value === 'string' ? value.trim() : '');

const getProfile = async (req, res) => {
  try {
    const user = req.user;
    return res.json({
      profile: {
        name: user.name || '',
        block: user.block || '',
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, block } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (typeof name === 'string') {
      user.name = name.trim();
    }
    if (typeof block === 'string') {
      user.block = block.trim();
    }

    await user.save();

    return res.json({
      message: 'Profile updated',
      profile: {
        name: user.name || '',
        block: user.block || '',
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation do not match' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: 'Password updated' });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ error: 'Failed to update password' });
  }
};

const recordAttendance = async (req, res) => {
  try {
    const { status = 'Present', note = '' } = req.body;
    const allowedStatuses = ['Present', 'Late', 'Absent'];
    const finalStatus = allowedStatuses.includes(status) ? status : 'Present';

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existing = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: todayStart, $lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000) },
    });
    if (existing) {
      return res.status(409).json({
        error: 'Attendance already recorded for today',
        record: {
          id: existing._id,
          date: existing.date.toISOString().slice(0, 10),
          status: existing.status,
          time: existing.time || '-',
          note: existing.note || '',
        },
      });
    }

    const timeStr = now.toTimeString().slice(0, 5);
    const record = await Attendance.create({
      user: req.user._id,
      date: todayStart,
      status: finalStatus,
      time: timeStr,
      note: trimIfString(note),
    });

    return res.status(201).json({
      message: 'Attendance recorded',
      record: {
        id: record._id,
        date: record.date.toISOString().slice(0, 10),
        status: record.status,
        time: record.time || '-',
        note: record.note || '',
      },
    });
  } catch (error) {
    console.error('Record attendance error:', error);
    return res.status(500).json({ error: 'Failed to record attendance' });
  }
};

const getAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ user: req.user._id }).sort({ date: -1 });

    const stats = records.reduce(
      (acc, record) => {
        if (record.status === 'Present') acc.presentDays += 1;
        if (record.status === 'Late') acc.lateDays += 1;
        if (record.status === 'Absent') acc.absentDays += 1;
        return acc;
      },
      { presentDays: 0, lateDays: 0, absentDays: 0 }
    );

    const normalizedRecords = records.map((record) => ({
      id: record._id,
      date: record.date ? record.date.toISOString().slice(0, 10) : '',
      status: record.status,
      time: trimIfString(record.time) || '-',
      note: trimIfString(record.note),
    }));

    return res.json({ stats, records: normalizedRecords });
  } catch (error) {
    console.error('Get attendance error:', error);
    return res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

const submitReport = async (req, res) => {
  try {
    const subject = trimIfString(req.body?.subject);
    const category = trimIfString(req.body?.category);
    const description = trimIfString(req.body?.description);

    if (!subject || !category || !description) {
      return res.status(400).json({ error: 'Subject, category, and description are required' });
    }

    if (description.length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }

    const report = await Report.create({
      user: req.user._id,
      subject,
      category,
      description,
    });

    return res.status(201).json({
      message: 'Report submitted',
      report: {
        id: report._id,
        subject: report.subject,
        category: report.category,
        description: report.description,
        status: report.status,
        severity: report.severity,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    console.error('Submit report error:', error);
    return res.status(500).json({ error: 'Failed to submit report' });
  }
};

const getReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id }).sort({ createdAt: -1 });

    return res.json({
      reports: reports.map((report) => ({
        id: report._id,
        subject: report.subject,
        category: report.category,
        description: report.description,
        status: report.status,
        severity: report.severity,
        createdAt: report.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get reports error:', error);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updatePassword,
  recordAttendance,
  getAttendance,
  submitReport,
  getReports,
};
