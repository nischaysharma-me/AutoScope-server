const { errorResponse } = require('../utilites/response.util');

const notFoundHandler = (req, res, next) => {
  return errorResponse(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
};

const globalErrorHandler = (err, req, res, next) => {
  console.error('[Error]:', err.stack || err.message || err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  return errorResponse(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : null);
};

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};
