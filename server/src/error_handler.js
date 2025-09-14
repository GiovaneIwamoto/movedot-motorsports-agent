function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong'
  });
}

// Middleware 404
function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: 'Not found',
    message: 'Endpoint not found'
  });
}

module.exports = { errorHandler, notFoundHandler };