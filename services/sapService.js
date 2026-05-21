const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// Standard Axios client instance pre-configured for SAP Gateway connectivity
const sapService = axios.create({
    baseURL: process.env.SAP_BASE_URL,
    auth: {
        username: process.env.SAP_USERNAME,
        password: process.env.SAP_PASSWORD
    },
    params: {
        'sap-client': process.env.SAP_CLIENT || '100'
    },
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    timeout: 8000 // 8-second request timeout limit before forcing local fallback
});

module.exports = sapService;
