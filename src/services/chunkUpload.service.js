const fs = require('fs');
const path = require('path');
const storageProvider = require('../providers/storage.provider');
const UploadSessionModel = require('../models/uploadSession.model');
const { removeDir } = require('../utilites/file.util');

class ChunkUploadService {
  initSession({ originalFilename, totalFileSize, totalChunks, scannerId }) {
    if (!originalFilename) {
      throw new Error('originalFilename is required');
    }
    if (!totalChunks || totalChunks < 1) {
      throw new Error('totalChunks must be at least 1');
    }

    const session = UploadSessionModel.create({
      originalFilename,
      totalFileSize,
      totalChunks,
      scannerId,
    });

    // Ensure chunks directory exists
    storageProvider.getChunkDirPath(session.id);

    return UploadSessionModel.formatSession(session);
  }

  getSessionStatus(uploadId) {
    const session = UploadSessionModel.findById(uploadId);
    if (!session) {
      throw new Error(`Upload session '${uploadId}' not found`);
    }
    return UploadSessionModel.formatSession(session);
  }

  getAllSessions() {
    return UploadSessionModel.findAll();
  }

  async saveChunk(uploadId, chunkIndex, file) {
    const session = UploadSessionModel.findById(uploadId);
    if (!session) {
      throw new Error(`Upload session '${uploadId}' not found`);
    }

    const index = Number(chunkIndex);
    if (isNaN(index) || index < 0 || index >= session.totalChunks) {
      throw new Error(`Invalid chunk index ${chunkIndex}. Expected between 0 and ${session.totalChunks - 1}`);
    }

    const targetPath = storageProvider.getChunkFilePath(uploadId, index);

    // If multer stored it in disk or memory, write/move to target chunk path
    if (file.path) {
      fs.copyFileSync(file.path, targetPath);
      fs.unlinkSync(file.path);
    } else if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer);
    } else {
      throw new Error('No chunk file data provided');
    }

    UploadSessionModel.updateChunk(uploadId, index, {
      size: file.size,
      path: targetPath,
    });

    // Check if upload is complete
    const isComplete = session.chunks.size === session.totalChunks;
    let completedFile = null;

    if (isComplete) {
      completedFile = await this.mergeChunks(uploadId);
    }

    return {
      session: UploadSessionModel.formatSession(session),
      isComplete,
      completedFile,
    };
  }

  async mergeChunks(uploadId) {
    const session = UploadSessionModel.findById(uploadId);
    if (!session) {
      throw new Error(`Upload session '${uploadId}' not found`);
    }

    const targetFilePath = storageProvider.getCompletedFilePath(uploadId, session.originalFilename);
    const writeStream = fs.createWriteStream(targetFilePath);

    return new Promise((resolve, reject) => {
      const appendNextChunk = (index) => {
        if (index >= session.totalChunks) {
          writeStream.end();
          return;
        }

        const chunkPath = storageProvider.getChunkFilePath(uploadId, index);
        if (!fs.existsSync(chunkPath)) {
          return reject(new Error(`Missing chunk file at index ${index}`));
        }

        const readStream = fs.createReadStream(chunkPath);
        readStream.pipe(writeStream, { end: false });
        readStream.on('end', () => {
          appendNextChunk(index + 1);
        });
        readStream.on('error', (err) => {
          reject(err);
        });
      };

      writeStream.on('finish', () => {
        // Clean up chunks directory
        const chunkDir = storageProvider.getChunkDirPath(uploadId);
        removeDir(chunkDir);

        // Mark as completed in model
        UploadSessionModel.complete(uploadId, targetFilePath);

        resolve({
          filePath: targetFilePath,
          fileName: path.basename(targetFilePath),
          fileSize: fs.statSync(targetFilePath).size,
        });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });

      // Start merging from chunk 0
      appendNextChunk(0);
    });
  }
}

module.exports = new ChunkUploadService();
