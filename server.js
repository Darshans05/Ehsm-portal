const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment configurations
dotenv.config();

const loginRoutes = require('./routes/loginRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const riskRoutes = require('./routes/riskRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Disable caching for development so modified files load instantly
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// Parse incoming request JSON payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log incoming request trace with timestamps
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Mount secure REST API Gateway routes
app.use('/api', loginRoutes);
app.use('/api', incidentRoutes);
app.use('/api', riskRoutes);

// Serve static SAP UI5 EHSM application assets from the 'webapp' folder
app.use(express.static(path.join(__dirname, 'webapp')));

// Standard single-page-application fallback routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'webapp', 'index.html'));
});

// Register Global Exception Middleware
app.use(errorHandler);

// Start the REST Gateway listener
app.listen(PORT, () => {
    console.log(`\n================================================================`);
    console.log(`  🚀 SAP UI5 EHSM Decoupled REST Gateway Server is Up!`);
    console.log(`  🌍 Address: http://localhost:${PORT}`);
    console.log(`  📂 Static Directory: '${path.join(__dirname, 'webapp')}'`);
    console.log(`================================================================\n`);
});
