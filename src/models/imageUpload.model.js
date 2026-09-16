const { v4: uuidv4 } = require('uuid');
const ImageChunkModel = require('./imageChunk.model');
const ImageArtifactModel = require('./artifact.model');

// In-memory data store for IMAGE_UPLOAD entity
const uploads = new Map();

class ImageUploadModel {
  static create({ originalFilename, totalFileSize, totalChunks, scannerId = null }) {
    const id = uuidv4();
    const upload = {
      id,
      scannerId,
      originalFilename,
      totalFileSize: Number(totalFileSize) || 0,
      totalChunks: Number(totalChunks) || 1,
      lastUploadedChunkIndex: -1,
      uploadStatus: 'IN_PROGRESS', // 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
      bullmqJobId: null,
      processingStatus: 'QUEUED', // 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
      completedFilePath: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    uploads.set(id, upload);
    return upload;
  }

  static findById(id) {
    return uploads.get(id) || null;
  }

  static findAll() {
    return Array.from(uploads.values()).map(upload => this.formatUpload(upload));
  }

  static updateChunk(id, chunkIndex, chunkMetadata) {
    const upload = uploads.get(id);
    if (!upload) return null;

    // Record in ImageChunkModel
    ImageChunkModel.create({
      imageUploadId: id,
      chunkIndex: Number(chunkIndex),
      chunkSize: chunkMetadata.size,
      checksum: chunkMetadata.checksum || null,
      storageKey: chunkMetadata.path,
    });

    upload.lastUploadedChunkIndex = Math.max(upload.lastUploadedChunkIndex, Number(chunkIndex));
    upload.updatedAt = new Date().toISOString();
    return upload;
  }

  static complete(id, completedFilePath) {
    const upload = uploads.get(id);
    if (!upload) return null;

    upload.uploadStatus = 'COMPLETED';
    upload.processingStatus = 'COMPLETED';
    upload.completedFilePath = completedFilePath;
    upload.updatedAt = new Date().toISOString();
    return upload;
  }

  static formatUpload(upload) {
    if (!upload) return null;
    const chunks = ImageChunkModel.findByUploadId(upload.id);
    const artifacts = ImageArtifactModel.findByUploadId(upload.id);

    return {
      id: upload.id,
      scannerId: upload.scannerId,
      originalFilename: upload.originalFilename,
      totalFileSize: upload.totalFileSize,
      totalChunks: upload.totalChunks,
      lastUploadedChunkIndex: upload.lastUploadedChunkIndex,
      uploadedChunksCount: chunks.length,
      uploadedChunkIndices: chunks.map(c => c.chunkIndex),
      uploadStatus: upload.uploadStatus,
      processingStatus: upload.processingStatus,
      completedFilePath: upload.completedFilePath,
      artifacts,
      createdAt: upload.createdAt,
      updatedAt: upload.updatedAt,
    };
  }
}

module.exports = ImageUploadModel;
