const axios = require('axios');
const sapConfig = require('../config/sapConfig');

// Pre-configured Axios instance for SAP OData connectivity
const sapService = axios.create({
    baseURL: sapConfig.baseUrl,
    auth: {
        username: sapConfig.username,
        password: sapConfig.password
    },
    params: {
        'sap-client': sapConfig.client
    },
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    timeout: 10000 // 10-second timeout limit
});

/**
 * Automates the SAP OData CSRF handshake by fetching the CSRF token and session cookies
 * via a GET request, then executing the modifying POST request with the validated headers.
 * 
 * @param {string} url Endpoint path (e.g. '/sap/opu/odata/SAP/ZEHSM_LOGIN_SRV_SRV/LoginehsmSet')
 * @param {object} data POST payload
 * @param {object} config Axios configuration containing auth credentials or extra headers
 * @returns {Promise<object>} Axios response promise
 */
sapService.postWithCsrf = async function (url, data, config = {}) {
    try {
        console.log(`[SAP Service] Pre-flight: Fetching CSRF Token from service root...`);
        
        // 1. Configure token fetch GET request
        const fetchConfig = {
            headers: {
                'x-csrf-token': 'fetch',
                'Accept': 'application/json'
            },
            params: {
                'sap-client': sapConfig.client
            }
        };

        // Propagate dynamic auth if supplied
        if (config.auth) {
            fetchConfig.auth = config.auth;
        }

        // GET request to service base URL to fetch the token and establish session cookie
        const fetchResponse = await this.get('/sap/opu/odata/SAP/ZEHSM_LOGIN_SRV_SRV/', fetchConfig);
        
        // Extract token and cookies from headers
        const csrfToken = fetchResponse.headers['x-csrf-token'] || fetchResponse.headers['X-CSRF-Token'];
        const setCookies = fetchResponse.headers['set-cookie'];

        if (!csrfToken) {
            throw new Error('SAP Gateway did not return a valid x-csrf-token in response headers.');
        }

        console.log(`[SAP Service] CSRF Handshake Success! Token: ${csrfToken.substring(0, 8)}...`);

        // 2. Prepare headers for the actual modifying POST request
        const postHeaders = {
            'x-csrf-token': csrfToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (setCookies) {
            // Re-inject all set cookies (e.g. session IDs, SSO tokens)
            postHeaders['Cookie'] = Array.isArray(setCookies) ? setCookies.join('; ') : setCookies;
        }

        // Merge any manual headers from the call configuration
        if (config.headers) {
            Object.assign(postHeaders, config.headers);
        }

        const postConfig = {
            ...config,
            headers: postHeaders,
            params: {
                'sap-client': sapConfig.client
            }
        };

        console.log(`[SAP Service] Sending CSRF-authorized POST to: ${url}`);
        
        // 3. Perform the actual POST request
        return await this.post(url, data, postConfig);

    } catch (error) {
        console.error(`[SAP Service] OData POST with CSRF failed:`, error.message);
        if (error.response) {
            console.error(`[SAP Service] Gateway Response Status: ${error.response.status}`);
            console.error(`[SAP Service] Gateway Response Body:`, JSON.stringify(error.response.data || {}));
        }
        throw error;
    }
};

module.exports = sapService;
