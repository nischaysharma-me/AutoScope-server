const { v4: uuidv4 } = require('uuid');

// In-memory data store for PROCESSED_IMAGE_METADATA & THUMBNAIL_METADATA entities
const artifacts = new Map();

class ImageArtifactModel {
  static create({
    imageUploadId,
    artifactType, // 'PROCESSED_IMAGE' | 'THUMBNAIL'
    storageKey,
    s3Bucket = 'autoscope-assets',
    width = 0,
    height = 0,
    fileSize = 0,
    format = 'image/jpeg',
    processingTimeMs = 0,
  }) {
    const id = uuidv4();
    const artifact = {
      id,
      imageUploadId,
      artifactType,
      storageKey,
      s3Bucket,
      width: Number(width),
      height: Number(height),
      fileSize: Number(fileSize),
      format,
      processingTimeMs: Number(processingTimeMs),
      createdAt: new Date().toISOString(),
    };
    artifacts.set(id, artifact);
    return artifact;
  }

  static findById(id) {
    return artifacts.get(id) || null;
  }

  static findByUploadId(imageUploadId) {
    return Array.from(artifacts.values())
      .filter(a => a.imageUploadId === imageUploadId);
  }

  static findAll() {
    return Array.from(artifacts.values());
  }
}

module.exports = ImageArtifactModel;
