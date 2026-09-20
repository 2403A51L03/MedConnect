export function notFoundHandler(request, response) {
  response.status(404).json({ error: `Route not found: ${request.method} ${request.originalUrl}` })
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error)
  }

  console.error(error)
  const isDatabaseUnavailable = error.name === 'PrismaClientInitializationError' || ['P1000', 'P1001', 'P1002', 'P1003', 'P2021', 'P2022'].includes(error.code)
  response.status(error.statusCode || (isDatabaseUnavailable ? 503 : 500)).json({
    error: error.statusCode
      ? error.message
      : isDatabaseUnavailable
        ? 'Database service is unavailable'
        : 'Internal server error',
  })
}
