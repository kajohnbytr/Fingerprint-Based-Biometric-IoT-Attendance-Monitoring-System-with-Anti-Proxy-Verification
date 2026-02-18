const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const InviteToken = require('../models/InviteToken');
const AuditLog = require('../models/AuditLog');
const SystemSettings = require('../models/SystemSettings');

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const normalizeRole = (roles) => {
  if (!roles || !Array.isArray(roles)) return 'admin';
  if (roles.includes('super_admin')) return 'super_admin';
  if (roles.includes('student')) return 'student';
  return 'admin';
};

const validateInvite = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ valid: false, error: 'Token required' });

    const invite = await InviteToken.findOne({ token, used: false });
    if (!invite) return res.json({ valid: false, error: 'Invalid or expired invite link' });
    if (new Date() > invite.expiresAt) return res.json({ valid: false, error: 'Invite link has expired' });

    return res.json({
      valid: true,
      email: invite.email || null,
    });
  } catch (error) {
    console.error('Validate invite error:', error);
    return res.status(500).json({ valid: false, error: 'Failed to validate invite' });
  }
};

const register = async (req, res) => {
  try {
    const {
      token: inviteToken,
      email,
      password,
      role,
      name,
      idNumber,
      block,
      comCourse,
      comSchedule,
      comRoom,
      comCourses,
      fingerprint,
      webauthnCredentialId,
      webauthnPublicKey,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedRole = role || 'student';

    if (normalizedRole === 'student') {
      if (!inviteToken) return res.status(400).json({ error: 'Registration requires a valid invite link from your admin or teacher' });
      const invite = await InviteToken.findOne({ token: inviteToken, used: false });
      if (!invite) return res.status(400).json({ error: 'Invalid or expired invite link. Please request a new one.' });
      if (new Date() > invite.expiresAt) return res.status(400).json({ error: 'Invite link has expired. Please request a new one.' });
      if (invite.email && invite.email !== email.toLowerCase().trim()) {
        return res.status(400).json({ error: 'This invite link is for a different email address' });
      }
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser)
      return res.status(409).json({ error: 'User already exists' });

    const normalizedEmail = email.toLowerCase().trim();

    const normalizedComCourses = Array.isArray(comCourses)
      ? comCourses
          .map((course) => ({
            courseName: typeof course?.courseName === 'string' ? course.courseName.trim() : '',
            schedule: typeof course?.schedule === 'string' ? course.schedule.trim() : '',
            room: typeof course?.room === 'string' ? course.room.trim() : '',
          }))
          .filter((course) => course.courseName || course.schedule || course.room)
      : [];

    const fallbackComCourse =
      typeof comCourse === 'string' ||
      typeof comSchedule === 'string' ||
      typeof comRoom === 'string'
        ? [
            {
              courseName: typeof comCourse === 'string' ? comCourse.trim() : '',
              schedule: typeof comSchedule === 'string' ? comSchedule.trim() : '',
              room: typeof comRoom === 'string' ? comRoom.trim() : '',
            },
          ]
        : [];

    const finalComCourses = normalizedComCourses.length > 0 ? normalizedComCourses : fallbackComCourse;

    if (normalizedRole === 'student') {
      if (!name || !idNumber || !block) {
        return res.status(400).json({ error: 'Name, ID number, and block are required for student registration' });
      }

      if (finalComCourses.length === 0) {
        return res.status(400).json({
          error: 'At least one COM course with schedule and room is required',
        });
      }

      if (finalComCourses.length > 12) {
        return res.status(400).json({ error: 'You can only register up to 12 courses' });
      }

      const hasInvalidCourse = finalComCourses.some(
        (course) => !course.courseName || !course.schedule || !course.room
      );

      if (hasInvalidCourse) {
        return res.status(400).json({
          error: 'Each course must include course name, schedule, and room',
        });
      }

      if (!normalizedEmail.includes('phinmaed')) {
        return res.status(400).json({ error: 'Please use your PHINMAED email address' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      roles: [normalizedRole],
      name: typeof name === 'string' ? name.trim() : '',
      idNumber: typeof idNumber === 'string' ? idNumber.trim() : '',
      block: typeof block === 'string' ? block.trim() : '',
      comCourse:
        finalComCourses[0]?.courseName || (typeof comCourse === 'string' ? comCourse.trim() : ''),
      comSchedule:
        finalComCourses[0]?.schedule || (typeof comSchedule === 'string' ? comSchedule.trim() : ''),
      comRoom: finalComCourses[0]?.room || (typeof comRoom === 'string' ? comRoom.trim() : ''),
      comCourses: finalComCourses,
      fingerprint: typeof fingerprint === 'string' ? fingerprint.trim() : '',
      webauthnCredentialId: typeof webauthnCredentialId === 'string' ? webauthnCredentialId.trim() : '',
      webauthnPublicKey: typeof webauthnPublicKey === 'string' ? webauthnPublicKey.trim() : '',
    });

    if (normalizedRole === 'student' && inviteToken) {
      await InviteToken.findOneAndUpdate(
        { token: inviteToken },
        { used: true, usedAt: new Date() }
      );
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: { email: newUser.email, role: newUser.roles[0] }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const role = normalizeRole(user.roles);

    if (expectedRole && role !== expectedRole) {
      return res.status(403).json({
        error: `Access denied. This login page is for ${expectedRole} only.`
      });
    }

    try {
      const maint = await SystemSettings.findOne({ key: 'maintenanceMode' });
      if (maint && maint.value && role !== 'super_admin') {
        return res.status(503).json({ error: 'System is under maintenance. Only super admins can access.' });
      }
    } catch (e) { /* ignore */ }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    /* COOKIE FIX — THIS WAS THE REAL PROBLEM */
    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    try {
      await AuditLog.create({
        action: 'User Login',
        user: user.email,
        details: 'Successful login',
        status: 'Success',
      });
    } catch (e) { /* ignore */ }

    res.json({
      message: 'Login successful',
      user: { email: user.email, role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const me = async (req, res) => {
  try {
    const role = normalizeRole(req.user.roles);
    res.json({ user: { email: req.user.email, role } });
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  });
  res.json({ message: 'Logged out successfully' });
};

module.exports = { register, login, me, logout, validateInvite };
