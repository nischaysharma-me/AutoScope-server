require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../configs/db.config');
const { ScannerModel } = require('../models');

const sampleScanners = [
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
  {
    deviceId: 'SCN-103',
    serialNumber: 'SN-AUTOSCOPE-003',
    name: 'Cytology Automated Scanner C',
    currentVersion: 'v1.2.0',
    status: 'ACTIVE',
  },
  {
    deviceId: 'SCN-104',
    serialNumber: 'SN-AUTOSCOPE-004',
    name: 'Dermatology High-Magnification D',
    currentVersion: 'v2.0.1',
    status: 'ACTIVE',
  },
  {
    deviceId: 'SCN-105',
    serialNumber: 'SN-AUTOSCOPE-005',
    name: 'Hematology Smear Scanner E',
    currentVersion: 'v1.1.0',
    status: 'UPDATING',
  },
];

async function seedScanners() {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    console.log('[Seed] Upserting sample scanners into MongoDB...');
    for (const scanner of sampleScanners) {
      await ScannerModel.findOneAndUpdate(
        { deviceId: scanner.deviceId },
        scanner,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✔ Seeded: ${scanner.deviceId} - ${scanner.name} (${scanner.status})`);
    }

    const total = await ScannerModel.countDocuments();
    console.log(`\n[Seed Success] Total scanners in database: ${total}`);
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed scanners:', error);
    process.exit(1);
  }
}

seedScanners();
