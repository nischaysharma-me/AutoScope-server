const multer = require('multer');
const path = require('path');
const os = require('os');
const config = require('../configs/app.config');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `chunk-${uniqueSuffix}${path.extname(file.originalname || '')}`);
  },
});

const uploadChunkMiddleware = multer({
  storage,
  limits: {
    fileSize: config.MAX_CHUNK_SIZE,
  },
}).single('chunk');

module.exports = {
  uploadChunkMiddleware,
};
