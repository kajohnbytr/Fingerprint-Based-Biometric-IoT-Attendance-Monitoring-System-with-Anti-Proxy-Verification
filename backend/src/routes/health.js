const express = require('express');
const SystemSettings = require('../models/SystemSettings');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/status', async (req, res) => {
  try {
    const doc = await SystemSettings.findOne({ key: 'maintenanceMode' });
    const maintenanceMode = doc ? !!doc.value : false;
    res.status(200).json({ status: 'ok', maintenanceMode });
  } catch {
    res.status(200).json({ status: 'ok', maintenanceMode: false });
  }
});

module.exports = router;
