const express = require('express');
const router = express.Router();
const riskController = require('../controllers/riskController');

// Route for querying risk hazard records
router.get('/risks', riskController.getRisks);

module.exports = router;
