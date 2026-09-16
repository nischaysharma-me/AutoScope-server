require('dotenv').config();
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const CHUNKS_DIR = path.join(UPLOADS_DIR, 'chunks');
const COMPLETED_DIR = path.join(UPLOADS_DIR, 'completed');

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  ROOT_DIR,
  UPLOADS_DIR,
  CHUNKS_DIR,
  COMPLETED_DIR,
  MAX_CHUNK_SIZE: 10 * 1024 * 1024, // 10MB per chunk max
  DEFAULT_CHUNK_SIZE: 1024 * 1024,  // 1MB default chunk recommendation
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || 'autoscope-specimen-scans',
  USE_S3_MOCK: process.env.USE_S3_MOCK === 'true' || !process.env.AWS_ACCESS_KEY_ID,
};
