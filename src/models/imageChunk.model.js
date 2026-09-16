const { v4: uuidv4 } = require('uuid');

// In-memory data store for CHUNK entity
const chunks = new Map();

class ImageChunkModel {
  static create({ imageUploadId, chunkIndex, chunkSize, checksum = null, storageKey = null }) {
    const id = uuidv4();
    const chunk = {
      id,
      imageUploadId,
      chunkIndex: Number(chunkIndex),
      chunkSize: Number(chunkSize) || 0,
      checksum,
      storageKey,
      status: 'UPLOADED', // 'PENDING' | 'UPLOADED'
      uploadedAt: new Date().toISOString(),
    };
    chunks.set(id, chunk);
    return chunk;
  }

  static findById(id) {
    return chunks.get(id) || null;
  }

  static findByUploadId(imageUploadId) {
    return Array.from(chunks.values())
      .filter(c => c.imageUploadId === imageUploadId)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  static findByUploadIdAndIndex(imageUploadId, chunkIndex) {
    return Array.from(chunks.values())
      .find(c => c.imageUploadId === imageUploadId && c.chunkIndex === Number(chunkIndex)) || null;
  }

  static deleteByUploadId(imageUploadId) {
    for (const [id, chunk] of chunks.entries()) {
      if (chunk.imageUploadId === imageUploadId) {
        chunks.delete(id);
      }
    }
  }
}

module.exports = ImageChunkModel;
