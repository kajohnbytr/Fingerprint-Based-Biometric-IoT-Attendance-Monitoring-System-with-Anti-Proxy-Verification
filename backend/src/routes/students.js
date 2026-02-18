const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  updatePassword,
  recordAttendance,
  getAttendance,
  submitReport,
  getReports,
} = require('../controllers/studentController');

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, updatePassword);
router.get('/attendance', authenticate, getAttendance);
router.post('/attendance', authenticate, recordAttendance);
router.post('/reports', authenticate, submitReport);
router.get('/reports', authenticate, getReports);

module.exports = router;
