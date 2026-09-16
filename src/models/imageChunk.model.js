const mongoose = require('mongoose');

const imageChunkSchema = new mongoose.Schema(
  {
    imageUploadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImageUpload',
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    chunkSize: {
      type: Number,
      required: true,
    },
    checksum: {
      type: String,
      default: null,
    },
    storageKey: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'UPLOADED'],
      default: 'UPLOADED',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
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

// Compound index to ensure uniqueness per upload and chunk index
imageChunkSchema.index({ imageUploadId: 1, chunkIndex: 1 }, { unique: true });

const ImageChunkModel = mongoose.model('ImageChunk', imageChunkSchema);

module.exports = ImageChunkModel;
