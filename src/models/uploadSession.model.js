const { v4: uuidv4 } = require('uuid');

// In-memory data store reflecting IMAGE_UPLOAD and CHUNK entities
const sessions = new Map();

class UploadSessionModel {
  static create({ originalFilename, totalFileSize, totalChunks, scannerId = null }) {
    const id = uuidv4();
    const session = {
      id,
      scannerId,
      originalFilename,
      totalFileSize: Number(totalFileSize) || 0,
      totalChunks: Number(totalChunks) || 1,
      lastUploadedChunkIndex: -1,
      uploadStatus: 'IN_PROGRESS', // IN_PROGRESS | COMPLETED | FAILED
      chunks: new Map(), // chunkIndex -> chunk metadata
      completedFilePath: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sessions.set(id, session);
    return session;
  }

  static findById(id) {
    return sessions.get(id) || null;
  }

  static findAll() {
    return Array.from(sessions.values()).map(session => this.formatSession(session));
  }

  static updateChunk(id, chunkIndex, chunkMetadata) {
    const session = sessions.get(id);
    if (!session) return null;

    session.chunks.set(Number(chunkIndex), {
      chunkIndex: Number(chunkIndex),
      chunkSize: chunkMetadata.size,
      checksum: chunkMetadata.checksum || null,
      storageKey: chunkMetadata.path,
      status: 'UPLOADED',
      uploadedAt: new Date().toISOString(),
    });

    session.lastUploadedChunkIndex = Math.max(session.lastUploadedChunkIndex, Number(chunkIndex));
    session.updatedAt = new Date().toISOString();
    return session;
  }

  static complete(id, completedFilePath) {
    const session = sessions.get(id);
    if (!session) return null;

    session.uploadStatus = 'COMPLETED';
    session.completedFilePath = completedFilePath;
    session.updatedAt = new Date().toISOString();
    return session;
  }

  static formatSession(session) {
    if (!session) return null;
    return {
      id: session.id,
      scannerId: session.scannerId,
      originalFilename: session.originalFilename,
      totalFileSize: session.totalFileSize,
      totalChunks: session.totalChunks,
      lastUploadedChunkIndex: session.lastUploadedChunkIndex,
      uploadedChunksCount: session.chunks.size,
      uploadedChunkIndices: Array.from(session.chunks.keys()).sort((a, b) => a - b),
      uploadStatus: session.uploadStatus,
      completedFilePath: session.completedFilePath,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}

module.exports = UploadSessionModel;
