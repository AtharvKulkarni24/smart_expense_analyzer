function errorHandler(err, req, res, next) {
  console.error('[SpendSense API Error]:', err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error occurred';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message,
      details: err.details || null,
    },
  });
}

module.exports = errorHandler;
