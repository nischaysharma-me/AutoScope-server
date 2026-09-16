const { ScannerModel } = require('../models');
const { successResponse, errorResponse } = require('../utilites/response.util');

class ScannerController {
  getAllScanners(req, res, next) {
    try {
      const scanners = ScannerModel.findAll();
      return successResponse(res, scanners, 'Scanners retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  getScannerById(req, res, next) {
    try {
      const { id } = req.params;
      const scanner = ScannerModel.findById(id) || ScannerModel.findByDeviceId(id);
      if (!scanner) {
        return errorResponse(res, `Scanner '${id}' not found`, 404);
      }
      return successResponse(res, scanner, 'Scanner details retrieved');
    } catch (error) {
      next(error);
    }
  }

  registerScanner(req, res, next) {
    try {
      const { deviceId, serialNumber, name, currentVersion } = req.body;
      const scanner = ScannerModel.create({
        deviceId,
        serialNumber,
        name,
        currentVersion,
      });
      return successResponse(res, scanner, 'Scanner registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ScannerController();
