const fs = require('fs');
const path = require('path');
const { ensureDir } = require('../utilites/file.util');
const config = require('../configs/app.config');

class LocalStorageProvider {
  constructor() {
    ensureDir(config.UPLOADS_DIR);
    ensureDir(config.CHUNKS_DIR);
    ensureDir(config.COMPLETED_DIR);
  }

  getChunkDirPath(uploadId) {
    const chunkDir = path.join(config.CHUNKS_DIR, uploadId);
    ensureDir(chunkDir);
    return chunkDir;
  }

  getChunkFilePath(uploadId, chunkIndex) {
    return path.join(this.getChunkDirPath(uploadId), `chunk_${chunkIndex}`);
  }

  getCompletedFilePath(uploadId, filename) {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return path.join(config.COMPLETED_DIR, `${uploadId}_${sanitizedFilename}`);
  }
}

module.exports = new LocalStorageProvider();
