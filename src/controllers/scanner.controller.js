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
}

module.exports = new ScannerController();
