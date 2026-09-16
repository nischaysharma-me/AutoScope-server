const fs = require('fs');
const path = require('path');
const chunkUploadService = require('../services/chunkUpload.service');
const storageProvider = require('../providers/storage.provider');
const { successResponse, errorResponse } = require('../utilites/response.util');

class UploadController {
  // POST /api/uploads/init
  async initUpload(req, res, next) {
    try {
      const { originalFilename, totalFileSize, totalChunks, scannerId } = req.body;

      if (!originalFilename || !totalChunks) {
        return errorResponse(res, 'Missing required fields: originalFilename, totalChunks', 400);
      }

      const session = await chunkUploadService.initSession({
        originalFilename,
        totalFileSize,
        totalChunks: parseInt(totalChunks, 10),
        scannerId,
      });

      return successResponse(res, session, 'Upload session initialized successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/uploads/:id/status
  async getUploadStatus(req, res, next) {
    try {
      const { id } = req.params;
      const session = await chunkUploadService.getSessionStatus(id);
      return successResponse(res, session, 'Upload session status retrieved');
    } catch (error) {
      next(error);
    }
  }

  // GET /api/uploads
  async getAllUploads(req, res, next) {
    try {
      const uploads = await chunkUploadService.getAllSessions();
      return successResponse(res, uploads, 'All upload sessions retrieved');
    } catch (error) {
      next(error);
    }
  }

  // POST /api/uploads/:id/chunk
  async uploadChunk(req, res, next) {
    try {
      const { id } = req.params;
      const { chunkIndex } = req.body;

      if (chunkIndex === undefined || chunkIndex === null) {
        return errorResponse(res, 'chunkIndex is required in form-data body', 400);
      }

      if (!req.file) {
        return errorResponse(res, 'No chunk file uploaded in field "chunk"', 400);
      }

      const result = await chunkUploadService.saveChunk(id, chunkIndex, req.file);

      const message = result.isComplete
        ? 'Final chunk uploaded and file merged successfully'
        : `Chunk ${chunkIndex} uploaded successfully`;

      return successResponse(res, {
        uploadId: id,
        chunkIndex: Number(chunkIndex),
        isComplete: result.isComplete,
        session: result.session,
        ...(result.completedFile && {
          completedFile: {
            fileName: result.completedFile.fileName,
            fileSize: result.completedFile.fileSize,
            downloadUrl: `/api/uploads/${id}/file`,
          },
        }),
      }, message);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/uploads/:id/file
  async downloadCompletedFile(req, res, next) {
    try {
      const { id } = req.params;
      const session = await chunkUploadService.getSessionStatus(id);

      if (session.uploadStatus !== 'COMPLETED') {
        return errorResponse(res, 'File is not yet fully uploaded or merged', 400);
      }

      // 1. If local file exists, serve it directly
      if (session.completedFilePath && fs.existsSync(session.completedFilePath)) {
        return res.download(session.completedFilePath, session.originalFilename);
      }

      // 2. If local file was deleted, fetch and stream directly from S3!
      const artifact = session.artifacts.find(a => a.artifactType === 'PROCESSED_IMAGE') || session.artifacts[0];
      if (artifact && artifact.storageKey) {
        console.log(`[S3 Streaming] Local file missing on disk. Streaming from S3 bucket: ${artifact.s3Bucket}, key: ${artifact.storageKey}`);
        try {
          const s3Object = await storageProvider.getObjectStreamFromS3(artifact.storageKey);

          res.setHeader('Content-Type', s3Object.ContentType || artifact.format || 'application/octet-stream');
          if (s3Object.ContentLength) {
            res.setHeader('Content-Length', s3Object.ContentLength);
          }
          res.setHeader('Content-Disposition', `inline; filename="${session.originalFilename}"`);

          return s3Object.Body.pipe(res);
        } catch (s3Err) {
          console.error('[S3 Fetch Error]:', s3Err.message);
          return errorResponse(res, `File missing locally and S3 fetch failed: ${s3Err.message}`, 404);
        }
      }

      return errorResponse(res, 'File not found on local disk or S3', 404);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/uploads/:id/chunks
  async getUploadChunks(req, res, next) {
    try {
      const { id } = req.params;
      const session = await chunkUploadService.getSessionStatus(id);
      const chunkDir = storageProvider.getChunkDirPath(id);

      const chunksWithDiskState = (session.uploadedChunkIndices || []).map(index => {
        const chunkPath = storageProvider.getChunkFilePath(id, index);
        const exists = fs.existsSync(chunkPath);
        return {
          chunkIndex: index,
          diskPath: chunkPath,
          existsOnDisk: exists,
          sizeBytes: exists ? fs.statSync(chunkPath).size : 0,
          downloadUrl: `/api/uploads/${id}/chunks/${index}`,
        };
      });

      return successResponse(res, {
        uploadId: id,
        totalChunks: session.totalChunks,
        chunksDirectory: chunkDir,
        chunks: chunksWithDiskState,
      }, 'Chunk details retrieved');
    } catch (error) {
      next(error);
    }
  }

  // GET /api/uploads/:id/chunks/:chunkIndex
  async downloadChunk(req, res, next) {
    try {
      const { id, chunkIndex } = req.params;
      const chunkPath = storageProvider.getChunkFilePath(id, chunkIndex);

      if (!fs.existsSync(chunkPath)) {
        return errorResponse(res, `Chunk file ${chunkIndex} not found on disk at ${chunkPath}`, 404);
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="chunk_${chunkIndex}.bin"`);
      return res.sendFile(chunkPath);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UploadController();
