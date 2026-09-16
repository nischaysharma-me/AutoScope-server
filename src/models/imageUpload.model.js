const mongoose = require('mongoose');

const imageUploadSchema = new mongoose.Schema(
  {
    scannerId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },
    totalFileSize: {
      type: Number,
      required: true,
    },
    totalChunks: {
      type: Number,
      required: true,
    },
    lastUploadedChunkIndex: {
      type: Number,
      default: -1,
    },
    uploadStatus: {
      type: String,
      enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED'],
      default: 'IN_PROGRESS',
    },
    bullmqJobId: {
      type: String,
      default: null,
    },
    processingStatus: {
      type: String,
      enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'QUEUED',
    },
    completedFilePath: {
      type: String,
      default: null,
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

const ImageUploadModel = mongoose.model('ImageUpload', imageUploadSchema);

module.exports = ImageUploadModel;
