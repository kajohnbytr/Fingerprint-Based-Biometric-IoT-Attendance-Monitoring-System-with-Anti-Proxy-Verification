import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { protect } from '../middleware/auth.js';

const router = express.Router();

//Register user
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Please fill all the fields' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await User.create({ email, password });
    const token = generateToken(user._id);
    
    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        role: user.roles[0] || 'admin', // Send the first role
      },
      token,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      error: 'Server error',
      message: err.message 
    });
  }
});

//Login user
router.post('/login', async (req, res) => {
  const { email, password, expectedRole } = req.body;
  
  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Please fill all the fields' });
    }
    
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user has the expected role (if provided)
    if (expectedRole && !user.roles.includes(expectedRole)) {
      return res.status(403).json({ error: 'You do not have permission to access this area' });
    }
    
    const token = generateToken(user._id);
    
    // Return user object with role to match frontend expectations
    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        role: expectedRole || user.roles[0] || 'admin', // Use expectedRole or first role
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      error: 'Server error',
      message: err.message 
    });
  }
});

//me route - Get current user
router.get('/me', protect, async (req, res) => {
  try {
    res.status(200).json({
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.roles[0] || 'admin',
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

//Logout route
router.post('/logout', async (req, res) => {
  // For token-based auth, just send success
  // Client will remove token from localStorage
  res.status(200).json({ message: 'Logged out successfully' });
});

//Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

export default router;