const fs = require('fs');
const path = require('path');
const sapService = require('../services/sapService');

/**
 * Fetches and filters risk assessment hazards from SAP or the local JSON mock data.
 */
exports.getRisks = async (req, res, next) => {
    try {
        console.log(`[Risk Controller] GET /api/risks - Querying SAP RISKASSESSMENTSet`);
        
        const config = {};
        if (global.sapActiveAuth) {
            config.auth = global.sapActiveAuth;
        }
        
        // Query SAP OData Risk Assessment collection
        const response = await sapService.get('/sap/opu/odata/SAP/ZEHSM_LOGIN_SRV_SRV/RISKASSESSMENTSet', config);
        const results = response.data?.d?.results || response.data?.results || response.data?.d || response.data;
        
        if (Array.isArray(results)) {
            console.log(`[Risk Controller] Successfully fetched ${results.length} risks from SAP.`);
            
            // Map SAP properties to the exact uppercase properties expected by UI5
            const mappedResults = results.map(item => ({
                RISK_ID: item.RiskId || item.RISK_ID || "",
                PLANT_ID: item.PlantId || item.PLANT_ID || "",
                RISK_TYPE: item.RiskType || item.RISK_TYPE || "",
                DESCRIPTION: item.Description || item.DESCRIPTION || "",
                RISK_LEVEL: item.RiskLevel || item.RISK_LEVEL || "",
                STATUS: item.Status || item.STATUS || "",
                CREATED_ON: item.CreatedOn || item.CREATED_ON || null
            }));

            return res.status(200).json(mappedResults);
        } else {
            throw new Error('SAP did not return an array of risks.');
        }

    } catch (error) {
        console.warn(`[Risk Controller] SAP Risk OData fetch failed, shifting to local mock data:`, error.message);
        
        // Fallback: Read local mock file
        const mockFilePath = path.join(__dirname, '../../webapp/model/mockData/Risks.json');
        fs.readFile(mockFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Failed to read local Risks.json mock data:', err);
                return res.status(500).json({ error: 'Failed to retrieve risk assessments.' });
            }
            
            try {
                const risks = JSON.parse(data);
                return res.status(200).json(risks);
            } catch (parseErr) {
                console.error('Failed to parse Risks mock JSON:', parseErr);
                return res.status(500).json({ error: 'Failed to parse risk mock data.' });
            }
        });
    }
};
