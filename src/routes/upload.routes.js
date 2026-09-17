const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { uploadChunkMiddleware } = require('../middlewares/multer.middleware');

// Resumable chunk upload endpoints
router.post('/init', uploadController.initUpload);
router.get('/', uploadController.getAllUploads);
router.get('/:id/status', uploadController.getUploadStatus);
router.post('/:id/chunk', uploadChunkMiddleware, uploadController.uploadChunk);
router.get('/queue/metrics', uploadController.getQueueMetrics);
router.get('/:id/job', uploadController.getJobStatus);
router.get('/:id/file', uploadController.downloadCompletedFile);
router.get('/:id/chunks', uploadController.getUploadChunks);
router.get('/:id/chunks/:chunkIndex', uploadController.downloadChunk);

module.exports = router;
