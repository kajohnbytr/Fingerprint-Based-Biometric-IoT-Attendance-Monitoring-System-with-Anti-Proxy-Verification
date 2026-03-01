const express = require('express');
const router = express.Router();

const { authenticate, requireRole, requireSuperAdmin } = require('../middleware/auth');
const {
  getOverview,
  getScheduleSummary,
  getReports,
  getReportBlockDetails,
  getAvailableBlocks,
  listArchiveRequests,
  createArchiveRequest,
  updateArchiveRequest,
  listUsers,
  createUser,
  updateUser,
  listAuditLogs,
  listAppReports,
  updateAppReport,
  getSettings,
  updateSettings,
  createInvite,
} = require('../controllers/adminController');

router.use(authenticate);
router.use(requireRole(['admin', 'super_admin']));

router.get('/overview', getOverview);
router.get('/schedule-summary', getScheduleSummary);
router.get('/reports', getReports);
router.get('/reports/block-details', getReportBlockDetails);
router.get('/archive-requests', listArchiveRequests);
router.post('/archive-requests', createArchiveRequest);
router.patch('/archive-requests/:id', requireSuperAdmin, updateArchiveRequest);

router.get('/available-blocks', requireSuperAdmin, getAvailableBlocks);
router.get('/users', requireSuperAdmin, listUsers);
router.post('/users', requireSuperAdmin, createUser);
router.patch('/users/:id', requireSuperAdmin, updateUser);

router.post('/invites', createInvite);

router.get('/audit-logs', requireSuperAdmin, listAuditLogs);

router.get('/app-reports', requireSuperAdmin, listAppReports);
router.patch('/app-reports/:id', requireSuperAdmin, updateAppReport);

router.get('/settings', requireSuperAdmin, getSettings);
router.put('/settings', requireSuperAdmin, updateSettings);

module.exports = router;
