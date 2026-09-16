const fs = require('fs');
const path = require('path');
const chunkUploadService = require('../services/chunkUpload.service');
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

      if (session.uploadStatus !== 'COMPLETED' || !session.completedFilePath) {
        return errorResponse(res, 'File is not yet fully uploaded or merged', 400);
      }

      if (!fs.existsSync(session.completedFilePath)) {
        return errorResponse(res, 'Completed file not found on disk', 404);
      }

      return res.download(session.completedFilePath, session.originalFilename);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UploadController();
