const express = require('express');
const router = express.Router();
const artifactController = require('../controllers/artifact.controller');

router.get('/', artifactController.getAllArtifacts);
router.get('/:id', artifactController.getArtifactById);
router.get('/upload/:uploadId', artifactController.getArtifactsByUploadId);

module.exports = router;
