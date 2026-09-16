const express = require('express');
const router = express.Router();
const uploadRoutes = require('./upload.routes');
const scannerRoutes = require('./scanner.routes');
const artifactRoutes = require('./artifact.routes');

router.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'AutoScope-server',
  });
});

router.use('/uploads', uploadRoutes);
router.use('/scanners', scannerRoutes);
router.use('/artifacts', artifactRoutes);

module.exports = router;
