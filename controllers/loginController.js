const sapService = require('../services/sapService');

/**
 * Validates employee credentials against the remote SAP Gateway ZEHSM_LOGIN_SRV_SRV service.
 * Automatically fails over to local demo authentication if SAP is down or blocked.
 */
exports.login = async (req, res, next) => {
    const { username, password } = req.body;
    const empId = username || req.body.empId;

    if (!empId || !password) {
        return res.status(400).json({
            success: false,
            message: 'Employee ID and Password are required.'
        });
    }

    try {
        console.log(`[${new Date().toISOString()}] Routing SAP authentication for Emp ID: ${empId}`);

        // Prepare OData payload
        const payload = {
            EmpId: empId,
            Password: password,
            Message: ''
        };

        // POST request to SAP OData Login entity set, dynamically passing entered credentials for Basic Auth
        const response = await sapService.post('/sap/opu/odata/SAP/ZEHSM_LOGIN_SRV_SRV/LoginehsmSet', payload, {
            auth: {
                username: empId,
                password: password
            }
        });
        const oData = response.data?.d || response.data;

        // Check if SAP returned failure message inside body
        const sapMessage = oData ? (oData.Message || oData.MESSAGE || '') : '';
        if (sapMessage && (
            sapMessage.toLowerCase().includes('fail') || 
            sapMessage.toLowerCase().includes('invalid') ||
            sapMessage.toLowerCase().includes('error')
        )) {
            global.sapActiveAuth = null; // Clear any existing auth
            return res.status(401).json({
                success: false,
                message: sapMessage || 'Invalid employee credentials.'
            });
        }

        // Save authenticated credentials in global session for downstream endpoints
        global.sapActiveAuth = {
            username: empId,
            password: password
        };
        console.log(`[${new Date().toISOString()}] SAP Authentication Successful! Established active session for: ${empId}`);

        // Return successful authentication response
        return res.status(200).json({
            success: true,
            empId: empId,
            role: 'Safety Engineer',
            mode: 'Live',
            message: oData.Message || oData.MESSAGE || 'Welcome to SAP EHSM Dashboard'
        });

    } catch (error) {
        console.warn(`[${new Date().toISOString()}] Remote SAP Authentication unreachable. Bypassing to Local Fallback...`, error.message);
        global.sapActiveAuth = null; // Clear active auth on connection failure fallback

        // Fallback demo validation logic (requires >= 4 chars for username/password)
        if (empId && password && password.length >= 4) {
            return res.status(200).json({
                success: true,
                empId: empId,
                role: 'Safety Engineer',
                mode: 'Offline Mock Data',
                message: 'Access Granted: Enterprise Fallback Mode'
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Authentication Failure: The remote SAP service could not be reached.\n\nTo login offline, supply a password of at least 4 characters.'
            });
        }
    }
};
