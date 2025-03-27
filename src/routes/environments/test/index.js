const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const config = require('../../../config/config');
const logger = require('../../../config/logger');

let swaggerRouter;
try {
    swaggerRouter = require('../development/swagger');
} catch (err) {
    logger.warn('Swagger router not found:', err.message);
}

logger.info('=== Loading Test Environment Routes ===');

// Keep track of all mounted routes
const mountedRoutes = [];

// Test environment specific middleware
router.use((req, res, next) => {
    logger.info(`[TEST] ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Dynamically load and mount API routes
const apiRoutesPath = path.join(__dirname, '../../../routes/api');
fs.readdirSync(apiRoutesPath).forEach(file => {
    // Skip non-js files
    if (!file.endsWith('.js')) {
        return;
    }

    try {
        // Convert filename to route path (e.g., user.js -> /user)
        const routePath = `/${file.replace('.js', '')}`;
        const fullPath = path.join(apiRoutesPath, file);
        
        // Import the route module
        const routeModule = require(fullPath);
        
        // Mount the route at the configured API path
        const fullRoutePath = `${config.server.apiRoute}${routePath}`;
        router.use(fullRoutePath, routeModule);
        
        // Store mounted route info
        mountedRoutes.push({
            path: fullRoutePath,
            file: file
        });
    } catch (err) {
        logger.error(`Error loading route file ${file}:`, err);
    }
});

// Mount Swagger documentation if available
if (swaggerRouter) {
    router.use('/swagger', swaggerRouter);
    mountedRoutes.push({
        path: '/swagger',
        file: 'swagger.js'
    });
} else {
    router.use('/swagger', (req, res) => {
        res.status(404).json({
            message: 'Swagger documentation is not available in this environment'
        });
    });
}

// Display all mounted routes
logger.info('\n=== Mounted Test Routes ===');
mountedRoutes.sort((a, b) => a.path.localeCompare(b.path))
    .forEach(route => {
        logger.info(`${route.path.padEnd(40)} [${route.file}]`);
    });
logger.info('===================\n');

// Test specific error handling
router.use((err, req, res, next) => {
    logger.error('[TEST Error]', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message,
            stack: err.stack,
            details: err
        }
    });
});

module.exports = router;
