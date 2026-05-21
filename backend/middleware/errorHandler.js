/**
 * Global Exception Handler Middleware
 * Parses and returns server exceptions as standardized JSON payloads.
 */
module.exports = (err, req, res, next) => {
    console.error(`[Error Handler] Unhandled Exception:`, err.stack || err.message || err);

    const statusCode = err.statusCode || (err.response ? err.response.status : 500);
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        message: message,
        error: err.code || 'INTERNAL_ERROR'
    });
};
