const mongoose = require('mongoose');

const scannerSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    serialNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    currentVersion: {
      type: String,
      default: 'v1.0.0',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'UPDATING', 'REVOKED', 'DECOMMISSIONED'],
      default: 'ACTIVE',
    },
    registeredAt: {
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

// Method to seed initial demo scanners
scannerSchema.statics.seedDefaults = async function () {
  const count = await this.countDocuments();
  if (count === 0) {
    await this.create([
      {
        deviceId: 'SCN-101',
        serialNumber: 'SN-AUTOSCOPE-001',
        name: 'Laboratory Pathology Scanner A',
        currentVersion: 'v1.0.0',
        status: 'ACTIVE',
      },
      {
        deviceId: 'SCN-102',
        serialNumber: 'SN-AUTOSCOPE-002',
        name: 'Histology High-Res Scanner B',
        currentVersion: 'v1.0.0',
        status: 'ACTIVE',
      },
    ]);
    console.log('[Seed] Default scanners SCN-101 and SCN-102 seeded into MongoDB');
  }
};

const ScannerModel = mongoose.model('Scanner', scannerSchema);

module.exports = ScannerModel;
