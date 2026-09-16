const fs = require('fs');
const path = require('path');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, AWS_S3_BUCKET_NAME, AWS_REGION, USE_S3_MOCK } = require('../configs/s3.config');
const { ensureDir } = require('../utilites/file.util');
const config = require('../configs/app.config');

class StorageProvider {
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

  /**
   * Uploads an assembled image or thumbnail artifact to Amazon S3
   * @param {string} localFilePath - Local path of the file
   * @param {string} s3Key - Destination S3 object key
   * @param {string} contentType - MIME type of the file
   */
  async uploadToS3(localFilePath, s3Key, contentType = 'application/octet-stream') {
    if (USE_S3_MOCK) {
      console.log(`[S3 Mock Storage] Uploading ${path.basename(localFilePath)} -> s3://${AWS_S3_BUCKET_NAME}/${s3Key}`);
      return {
        bucket: AWS_S3_BUCKET_NAME,
        key: s3Key,
        location: `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`,
        eTag: `"mock-etag-${Date.now()}"`,
        isMock: true,
      };
    }

    try {
      const fileStream = fs.createReadStream(localFilePath);
      const command = new PutObjectCommand({
        Bucket: AWS_S3_BUCKET_NAME,
        Key: s3Key,
        Body: fileStream,
        ContentType: contentType,
      });

      const response = await s3Client.send(command);
      console.log(`[S3 Storage] Successfully uploaded to s3://${AWS_S3_BUCKET_NAME}/${s3Key}`);

      return {
        bucket: AWS_S3_BUCKET_NAME,
        key: s3Key,
        location: `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`,
        eTag: response.ETag,
        isMock: false,
      };
    } catch (error) {
      console.warn(`[S3 Upload Warning] S3 upload failed (${error.message}). Falling back to local/mock S3 state.`);
      return {
        bucket: AWS_S3_BUCKET_NAME,
        key: s3Key,
        location: `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`,
        eTag: `"fallback-etag-${Date.now()}"`,
        isMock: true,
        error: error.message,
      };
    }
  }

  /**
   * Generate a pre-signed download URL for an S3 object
   */
  async getSignedDownloadUrl(s3Key, expiresInSeconds = 3600) {
    if (USE_S3_MOCK) {
      return `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${s3Key}?mock_signature=${Date.now()}`;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: AWS_S3_BUCKET_NAME,
        Key: s3Key,
      });
      return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    } catch (error) {
      return `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;
    }
  }
}

module.exports = new StorageProvider();
