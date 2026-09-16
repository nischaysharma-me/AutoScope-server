const mongoose = require('mongoose');

const imageArtifactSchema = new mongoose.Schema(
  {
    imageUploadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImageUpload',
      required: true,
      index: true,
    },
    artifactType: {
      type: String,
      enum: ['PROCESSED_IMAGE', 'THUMBNAIL'],
      required: true,
    },
    storageKey: {
      type: String,
      required: true,
    },
    s3Bucket: {
      type: String,
      default: 'autoscope-images',
    },
    width: {
      type: Number,
      default: 0,
    },
    height: {
      type: Number,
      default: 0,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    format: {
      type: String,
      default: 'image/jpeg',
    },
    processingTimeMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const ImageArtifactModel = mongoose.model('ImageArtifact', imageArtifactSchema);

module.exports = ImageArtifactModel;
