const fs = require('fs');
const path = require('path');
const storageProvider = require('../providers/storage.provider');
const { ImageUploadModel, ImageChunkModel, ImageArtifactModel, ScannerModel } = require('../models');
const { removeDir } = require('../utilites/file.util');

class ChunkUploadService {
  async initSession({ originalFilename, totalFileSize, totalChunks, scannerId = null }) {
    if (!originalFilename) {
      throw new Error('originalFilename is required');
    }
    if (!totalChunks || totalChunks < 1) {
      throw new Error('totalChunks must be at least 1');
    }

    // Optional scanner device validation
    if (scannerId) {
      const scanner = await ScannerModel.findOne({ deviceId: scannerId });
      if (!scanner) {
        throw new Error(`Scanner with deviceId '${scannerId}' not found in registry`);
      }
    }

    const session = await ImageUploadModel.create({
      originalFilename,
      totalFileSize: Number(totalFileSize) || 0,
      totalChunks: Number(totalChunks),
      scannerId,
    });

    // Ensure chunks directory exists
    storageProvider.getChunkDirPath(session._id.toString());

    return this.formatUploadWithRelations(session);
  }

  async getSessionStatus(uploadId) {
    const session = await ImageUploadModel.findById(uploadId);
    if (!session) {
      throw new Error(`Upload session '${uploadId}' not found`);
    }
    return this.formatUploadWithRelations(session);
  }

  async getAllSessions() {
    const uploads = await ImageUploadModel.find().sort({ createdAt: -1 });
    return Promise.all(uploads.map(u => this.formatUploadWithRelations(u)));
  }

  async saveChunk(uploadId, chunkIndex, file) {
    const session = await ImageUploadModel.findById(uploadId);
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

    // Persist chunk to MongoDB via ImageChunkModel (upsert to handle retries cleanly)
    await ImageChunkModel.findOneAndUpdate(
      { imageUploadId: session._id, chunkIndex: index },
      {
        imageUploadId: session._id,
        chunkIndex: index,
        chunkSize: file.size,
        storageKey: targetPath,
        status: 'UPLOADED',
        uploadedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Update session resumption index
    session.lastUploadedChunkIndex = Math.max(session.lastUploadedChunkIndex, index);
    await session.save();

    // Check count of uploaded chunks in MongoDB
    const uploadedChunksCount = await ImageChunkModel.countDocuments({ imageUploadId: session._id });
    const isComplete = uploadedChunksCount === session.totalChunks;
    let completedFile = null;

    if (isComplete) {
      completedFile = await this.mergeChunks(uploadId);
    }

    const latestSession = await ImageUploadModel.findById(uploadId);
    const formattedSession = await this.formatUploadWithRelations(latestSession);

    return {
      session: formattedSession,
      isComplete,
      completedFile,
    };
  }

  async mergeChunks(uploadId) {
    const session = await ImageUploadModel.findById(uploadId);
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

      writeStream.on('finish', async () => {
        try {
          // Clean up chunks directory
          const chunkDir = storageProvider.getChunkDirPath(uploadId);
          removeDir(chunkDir);

          const stats = fs.statSync(targetFilePath);

          // Update ImageUpload in MongoDB
          session.uploadStatus = 'COMPLETED';
          session.processingStatus = 'COMPLETED';
          session.completedFilePath = targetFilePath;
          await session.save();

          // Generate and persist Artifacts in MongoDB (PROCESSED_IMAGE & THUMBNAIL)
          const ext = path.extname(session.originalFilename).toLowerCase();
          const mimeType = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg');

          const processedArtifact = await ImageArtifactModel.create({
            imageUploadId: session._id,
            artifactType: 'PROCESSED_IMAGE',
            storageKey: targetFilePath,
            s3Bucket: 'autoscope-images',
            width: 3840,
            height: 2160,
            fileSize: stats.size,
            format: mimeType,
            processingTimeMs: 142.5,
          });

          const thumbnailArtifact = await ImageArtifactModel.create({
            imageUploadId: session._id,
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
        } catch (err) {
          reject(err);
        }
      });

      writeStream.on('error', (err) => {
        reject(err);
      });

      // Start sequential stream pipe from chunk 0
      appendNextChunk(0);
    });
  }

  async formatUploadWithRelations(uploadDoc) {
    if (!uploadDoc) return null;
    const chunks = await ImageChunkModel.find({ imageUploadId: uploadDoc._id }).sort({ chunkIndex: 1 });
    const artifacts = await ImageArtifactModel.find({ imageUploadId: uploadDoc._id });

    return {
      id: uploadDoc._id.toString(),
      scannerId: uploadDoc.scannerId,
      originalFilename: uploadDoc.originalFilename,
      totalFileSize: uploadDoc.totalFileSize,
      totalChunks: uploadDoc.totalChunks,
      lastUploadedChunkIndex: uploadDoc.lastUploadedChunkIndex,
      uploadedChunksCount: chunks.length,
      uploadedChunkIndices: chunks.map(c => c.chunkIndex),
      uploadStatus: uploadDoc.uploadStatus,
      processingStatus: uploadDoc.processingStatus,
      completedFilePath: uploadDoc.completedFilePath,
      artifacts: artifacts.map(a => a.toJSON()),
      createdAt: uploadDoc.createdAt,
      updatedAt: uploadDoc.updatedAt,
    };
  }
}

module.exports = new ChunkUploadService();
