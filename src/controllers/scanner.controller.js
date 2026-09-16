const { ScannerModel } = require('../models');
const { successResponse, errorResponse } = require('../utilites/response.util');

class ScannerController {
  async getAllScanners(req, res, next) {
    try {
      const scanners = await ScannerModel.find().sort({ createdAt: -1 });
      return successResponse(res, scanners, 'Scanners retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getScannerById(req, res, next) {
    try {
      const { id } = req.params;
      let scanner = null;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        scanner = await ScannerModel.findById(id);
      }
      if (!scanner) {
        scanner = await ScannerModel.findOne({ deviceId: id });
      }

      if (!scanner) {
        return errorResponse(res, `Scanner '${id}' not found`, 404);
      }
      return successResponse(res, scanner, 'Scanner details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async registerScanner(req, res, next) {
    try {
      const { deviceId, serialNumber, name, currentVersion } = req.body;
      const scanner = await ScannerModel.create({
        deviceId: deviceId || `SCN-${Date.now().toString().slice(-4)}`,
        serialNumber: serialNumber || `SN-${Date.now()}`,
        name: name || `Scanner ${deviceId}`,
        currentVersion: currentVersion || 'v1.0.0',
      });
      return successResponse(res, scanner, 'Scanner registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async seedScanners(req, res, next) {
    try {
      const defaultScanners = [
        { deviceId: 'SCN-101', serialNumber: 'SN-AUTOSCOPE-001', name: 'Laboratory Pathology Scanner A', currentVersion: 'v1.0.0', status: 'ACTIVE' },
        { deviceId: 'SCN-102', serialNumber: 'SN-AUTOSCOPE-002', name: 'Histology High-Res Scanner B', currentVersion: 'v1.0.0', status: 'ACTIVE' },
        { deviceId: 'SCN-103', serialNumber: 'SN-AUTOSCOPE-003', name: 'Cytology Automated Scanner C', currentVersion: 'v1.2.0', status: 'ACTIVE' },
        { deviceId: 'SCN-104', serialNumber: 'SN-AUTOSCOPE-004', name: 'Dermatology High-Magnification D', currentVersion: 'v2.0.1', status: 'ACTIVE' },
        { deviceId: 'SCN-105', serialNumber: 'SN-AUTOSCOPE-005', name: 'Hematology Smear Scanner E', currentVersion: 'v1.1.0', status: 'UPDATING' },
      ];

      const results = [];
      for (const item of defaultScanners) {
        const scanner = await ScannerModel.findOneAndUpdate(
          { deviceId: item.deviceId },
          item,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        results.push(scanner);
      }

      return successResponse(res, results, 'Scanners seeded successfully in MongoDB', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ScannerController();
