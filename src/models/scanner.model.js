const { v4: uuidv4 } = require('uuid');

// In-memory data store for SCANNER entity
const scanners = new Map();

class ScannerModel {
  static create({ deviceId, serialNumber, name, currentVersion = 'v1.0.0', status = 'ACTIVE' }) {
    const id = uuidv4();
    const scanner = {
      id,
      deviceId: deviceId || `SCN-${Date.now().toString().slice(-4)}`,
      serialNumber: serialNumber || `SN-${uuidv4().slice(0, 8).toUpperCase()}`,
      name: name || `Scanner ${deviceId}`,
      currentVersion,
      status, // 'ACTIVE' | 'UPDATING' | 'REVOKED' | 'DECOMMISSIONED'
      registeredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    scanners.set(id, scanner);
    return scanner;
  }

  static findById(id) {
    return scanners.get(id) || null;
  }

  static findByDeviceId(deviceId) {
    for (const scanner of scanners.values()) {
      if (scanner.deviceId === deviceId) return scanner;
    }
    return null;
  }

  static findAll() {
    return Array.from(scanners.values());
  }

  static updateStatus(id, status) {
    const scanner = scanners.get(id);
    if (!scanner) return null;
    scanner.status = status;
    scanner.updatedAt = new Date().toISOString();
    return scanner;
  }

  static updateVersion(id, currentVersion) {
    const scanner = scanners.get(id);
    if (!scanner) return null;
    scanner.currentVersion = currentVersion;
    scanner.updatedAt = new Date().toISOString();
    return scanner;
  }
}

// Seed default scanners for demo
ScannerModel.create({
  deviceId: 'SCN-101',
  serialNumber: 'SN-AUTOSCOPE-001',
  name: 'Laboratory Pathology Scanner A',
  currentVersion: 'v1.0.0',
  status: 'ACTIVE',
});

ScannerModel.create({
  deviceId: 'SCN-102',
  serialNumber: 'SN-AUTOSCOPE-002',
  name: 'Histology High-Res Scanner B',
  currentVersion: 'v1.0.0',
  status: 'ACTIVE',
});

module.exports = ScannerModel;
