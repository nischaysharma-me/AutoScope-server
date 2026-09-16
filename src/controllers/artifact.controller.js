const { ImageArtifactModel } = require('../models');
const { successResponse, errorResponse } = require('../utilites/response.util');

class ArtifactController {
  getAllArtifacts(req, res, next) {
    try {
      const artifacts = ImageArtifactModel.findAll();
      return successResponse(res, artifacts, 'Artifacts retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  getArtifactById(req, res, next) {
    try {
      const { id } = req.params;
      const artifact = ImageArtifactModel.findById(id);
      if (!artifact) {
        return errorResponse(res, `Artifact '${id}' not found`, 404);
      }
      return successResponse(res, artifact, 'Artifact details retrieved');
    } catch (error) {
      next(error);
    }
  }

  getArtifactsByUploadId(req, res, next) {
    try {
      const { uploadId } = req.params;
      const artifacts = ImageArtifactModel.findByUploadId(uploadId);
      return successResponse(res, artifacts, `Artifacts for upload '${uploadId}' retrieved`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ArtifactController();
