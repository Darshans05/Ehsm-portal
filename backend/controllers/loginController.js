const sapService = require('../services/sapService');

/**
 * Validates employee credentials against the remote SAP Gateway LoginehsmSet service.
 * Automatically fails over to local mock validation if SAP is offline.
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
        console.log(`[Login Controller] Dynamic OData login request for Emp ID: ${empId}`);

        // Prepare OData payload with the exact property casing expected by SAP Gateway
        const payload = {
            Empid: empId,
            Password: password,
            Message: ''
        };

        // POST request to SAP OData Login entity set, dynamically executing CSRF handshake
        const response = await sapService.postWithCsrf('/sap/opu/odata/SAP/ZEHSM_LOGIN_SRV_SRV/LoginehsmSet', payload, {
            auth: {
                username: empId,
                password: password
            }
        });
        
        const oData = response.data?.d || response.data;

        // Check if SAP returned a success message inside body (strict validation)
        const sapMessage = oData ? (oData.Message || oData.MESSAGE || '') : '';
        const isSuccess = sapMessage.toLowerCase().includes('success');
        
        if (!isSuccess) {
            global.sapActiveAuth = null; // Clear active auth
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
        console.log(`[Login Controller] SAP OData login successful! Active session established for: ${empId}`);

        // Return successful authentication response
        return res.status(200).json({
            success: true,
            empId: empId,
            role: 'Safety Engineer',
            mode: 'Live',
            message: sapMessage || 'Welcome to SAP EHSM Dashboard'
        });

    } catch (error) {
        console.warn(`[Login Controller] SAP OData unreachable. Shifting to Local Fallback...`, error.message);
        global.sapActiveAuth = null; // Clear active auth on connection failure fallback

        // Strict fallback validation logic for employee "00000001" / "CHENNAI@123"
        if (empId === "00000001" && password === "CHENNAI@123") {
            return res.status(200).json({
                success: true,
                empId: empId,
                role: 'Safety Engineer',
                mode: 'Offline Fallback',
                message: 'Access Granted: Enterprise Fallback Mode'
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Authentication Failure: The entered Employee ID or Password does not match our security database.'
            });
        }
    }
};
