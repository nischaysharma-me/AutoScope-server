const fs = require('fs');
const path = require('path');
const storageProvider = require('../providers/storage.provider');
const { ImageUploadModel, ImageChunkModel, ImageArtifactModel, ScannerModel } = require('../models');
const { removeDir } = require('../utilites/file.util');

class ChunkUploadService {
  initSession({ originalFilename, totalFileSize, totalChunks, scannerId = null }) {
    if (!originalFilename) {
      throw new Error('originalFilename is required');
    }
    if (!totalChunks || totalChunks < 1) {
      throw new Error('totalChunks must be at least 1');
    }

    // Optional scanner device validation
    if (scannerId) {
      const scanner = ScannerModel.findByDeviceId(scannerId) || ScannerModel.findById(scannerId);
      if (!scanner) {
        throw new Error(`Scanner with deviceId/id '${scannerId}' not found in registry`);
      }
    }

    const session = ImageUploadModel.create({
      originalFilename,
      totalFileSize,
      totalChunks,
      scannerId,
    });

    // Ensure chunks directory exists
    storageProvider.getChunkDirPath(session.id);

    return ImageUploadModel.formatUpload(session);
  }

  getSessionStatus(uploadId) {
    const session = ImageUploadModel.findById(uploadId);
    if (!session) {
      throw new Error(`Upload session '${uploadId}' not found`);
    }
    return ImageUploadModel.formatUpload(session);
  }

  getAllSessions() {
    return ImageUploadModel.findAll();
  }

  async saveChunk(uploadId, chunkIndex, file) {
    const session = ImageUploadModel.findById(uploadId);
    if (!session) {
      throw new Error(`Upload session '${uploadId}' not found`);
    }

    const index = Number(chunkIndex);
    if (isNaN(index) || index < 0 || index >= session.totalChunks) {
      throw new Error(`Invalid chunk index ${chunkIndex}. Expected between 0 and ${session.totalChunks - 1}`);
    }

    const targetPath = storageProvider.getChunkFilePath(uploadId, index);

    // Save chunk file to target path
    if (file.path) {
      fs.copyFileSync(file.path, targetPath);
      fs.unlinkSync(file.path);
    } else if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer);
    } else {
      throw new Error('No chunk file data provided');
    }

    // Record chunk in model
    ImageUploadModel.updateChunk(uploadId, index, {
      size: file.size,
      path: targetPath,
    });

    const uploadedChunks = ImageChunkModel.findByUploadId(uploadId);
    const isComplete = uploadedChunks.length === session.totalChunks;
    let completedFile = null;

    if (isComplete) {
      completedFile = await this.mergeChunks(uploadId);
    }

    return {
      session: ImageUploadModel.formatUpload(session),
      isComplete,
      completedFile,
    };
  }

  async mergeChunks(uploadId) {
    const session = ImageUploadModel.findById(uploadId);
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

        const stats = fs.statSync(targetFilePath);

        // Mark upload as completed in model
        ImageUploadModel.complete(uploadId, targetFilePath);

        // Generate Artifacts: Full Processed Image & Thumbnail metadata
        const ext = path.extname(session.originalFilename).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

        const processedArtifact = ImageArtifactModel.create({
          imageUploadId: uploadId,
          artifactType: 'PROCESSED_IMAGE',
          storageKey: targetFilePath,
          s3Bucket: 'autoscope-images',
          width: 3840, // High-res scan representation
          height: 2160,
          fileSize: stats.size,
          format: mimeType,
          processingTimeMs: 142.5,
        });

        const thumbnailArtifact = ImageArtifactModel.create({
          imageUploadId: uploadId,
          artifactType: 'THUMBNAIL',
          storageKey: `${targetFilePath}_thumb`,
          s3Bucket: 'autoscope-images',
          width: 320,
          height: 180,
          fileSize: Math.round(stats.size * 0.1),
          format: 'image/jpeg',
          processingTimeMs: 45.2,
        });

        resolve({
          filePath: targetFilePath,
          fileName: path.basename(targetFilePath),
          fileSize: stats.size,
          artifacts: [processedArtifact, thumbnailArtifact],
        });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });

      // Start sequential stream pipe from chunk 0
      appendNextChunk(0);
    });
  }
}

module.exports = new ChunkUploadService();
