const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const normalizeRole = (roles) => {
  if (!roles || !Array.isArray(roles)) return 'admin';
  if (roles.includes('super_admin')) return 'super_admin';
  if (roles.includes('student')) return 'student';
  return 'admin';
};

const register = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser)
      return res.status(409).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      roles: role ? [role] : ['admin']
    });

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

module.exports = { register, login, me, logout };
