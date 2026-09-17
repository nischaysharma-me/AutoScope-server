const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./configs/app.config');
const { connectDB } = require('./configs/db.config');
const { ScannerModel } = require('./models');
const { startWorker } = require('./workers/image.worker');
const apiRoutes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorHandler.middleware');

const app = express();

const docsRoutes = require('./routes/docs.routes');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve completed files statically under /files
app.use('/files', express.static(config.COMPLETED_DIR));

// Serve frontend static files from public
app.use(express.static(path.join(__dirname, '../public')));

// Host Documentation Portal with marked and mermaid
app.use('/docs', docsRoutes);

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

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Seed default scanners if needed
    await ScannerModel.seedDefaults();

    // Start BullMQ Image Processing Worker
    startWorker();

    if (process.env.NODE_ENV !== 'test') {
      app.listen(config.PORT, () => {
        console.log(`AutoScope Server running on http://localhost:${config.PORT}`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
