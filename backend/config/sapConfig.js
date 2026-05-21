const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    baseUrl: process.env.SAP_BASE_URL || 'http://AZKTLDS5CP.kcloud.com:8000',
    client: process.env.SAP_CLIENT || '100',
    username: process.env.SAP_USERNAME || '',
    password: process.env.SAP_PASSWORD || '',
    useMockFallback: process.env.USE_MOCK_FALLBACK !== 'false'
};
