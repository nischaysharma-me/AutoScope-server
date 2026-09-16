const express = require('express');
const router = express.Router();
const uploadRoutes = require('./upload.routes');

router.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'AutoScope-server',
  });
});

router.use('/uploads', uploadRoutes);

module.exports = router;
