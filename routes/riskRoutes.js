const express = require('express');
const router = express.Router();
const riskController = require('../controllers/riskController');

// Route for fetching and filtering risk assessments
router.get('/risks', riskController.getRisks);

module.exports = router;
