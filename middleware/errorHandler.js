// Unified global Express exception catcher and logger
module.exports = (err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] REST Gateway Error Handler Caught:`, err.stack || err.message || err);
    
    const statusCode = err.statusCode || err.response?.status || 500;
    const errorMessage = err.message || 'Internal REST Gateway Error';

    res.status(statusCode).json({
        success: false,
        error: {
            message: errorMessage,
            status: statusCode,
            details: err.response?.data || null
        }
    });
};
