const { ImageArtifactModel } = require('../models');
const { successResponse, errorResponse } = require('../utilites/response.util');

class ArtifactController {
  async getAllArtifacts(req, res, next) {
    try {
      const artifacts = await ImageArtifactModel.find().populate('imageUploadId').sort({ createdAt: -1 });
      return successResponse(res, artifacts, 'Artifacts retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getArtifactById(req, res, next) {
    try {
      const { id } = req.params;
      const artifact = await ImageArtifactModel.findById(id);
      if (!artifact) {
        return errorResponse(res, `Artifact '${id}' not found`, 404);
      }
      return successResponse(res, artifact, 'Artifact details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getArtifactsByUploadId(req, res, next) {
    try {
      const { uploadId } = req.params;
      const artifacts = await ImageArtifactModel.find({ imageUploadId: uploadId });
      return successResponse(res, artifacts, `Artifacts for upload '${uploadId}' retrieved`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ArtifactController();
