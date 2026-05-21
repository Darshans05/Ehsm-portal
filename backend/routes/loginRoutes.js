const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

// Route for handling employee authentications
router.post('/login', loginController.login);

module.exports = router;
