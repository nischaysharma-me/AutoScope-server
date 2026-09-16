const express = require('express');
const router = express.Router();
const scannerController = require('../controllers/scanner.controller');

router.get('/', scannerController.getAllScanners);
router.post('/', scannerController.registerScanner);
router.get('/:id', scannerController.getScannerById);

module.exports = router;
