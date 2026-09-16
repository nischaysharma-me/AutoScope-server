const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./configs/app.config');
const apiRoutes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorHandler.middleware');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve completed files statically under /files
app.use('/files', express.static(config.COMPLETED_DIR));

// Serve frontend static files from public
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api', apiRoutes);

// API documentation route
app.get('/api', (req, res) => {
  res.json({
    message: 'AutoScope Server API',
    endpoints: {
      health: 'GET /api/health',
      scanners: 'GET /api/scanners',
      artifacts: 'GET /api/artifacts',
      initUpload: 'POST /api/uploads/init',
      listUploads: 'GET /api/uploads',
      getUploadStatus: 'GET /api/uploads/:id/status',
      uploadChunk: 'POST /api/uploads/:id/chunk',
      downloadFile: 'GET /api/uploads/:id/file',
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`AutoScope Server running on http://localhost:${config.PORT}`);
  });
}

module.exports = app;
