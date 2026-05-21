const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');

// Route for querying registered incidents
router.get('/incidents', incidentController.getIncidents);

module.exports = router;
