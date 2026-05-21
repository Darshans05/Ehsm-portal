const fs = require('fs');
const path = require('path');
const sapService = require('../services/sapService');

/**
 * Fetches and filters incident logs from SAP or the local JSON mock data.
 */
exports.getIncidents = async (req, res, next) => {
    try {
        console.log(`[${new Date().toISOString()}] GET /api/incidents - Querying SAP IncidentSet`);
        
        const config = {};
        if (global.sapActiveAuth) {
            config.auth = global.sapActiveAuth;
        }
        
        // Query SAP OData Incident collection
        const response = await sapService.get('/sap/opu/odata/SAP/ZEHSM_LOGIN_SRV_SRV/IncidentSet', config);
        const results = response.data?.d?.results || response.data?.results || response.data?.d || response.data;
        
        if (Array.isArray(results)) {
            console.log(`[${new Date().toISOString()}] Successfully fetched ${results.length} incidents from SAP.`);
            
            // Map SAP properties to the exact uppercase properties expected by UI5
            const mappedResults = results.map(item => ({
                INCIDENT_ID: item.IncidentId || item.INCIDENT_ID || "",
                EMP_ID: item.EmpId || item.EMP_ID || "",
                PLANT_ID: item.PlantId || item.PLANT_ID || "",
                INCIDENT_TYPE: item.IncidentType || item.INCIDENT_TYPE || "",
                DESCRIPTION: item.Description || item.DESCRIPTION || "",
                SEVERITY: item.Severity || item.SEVERITY || "",
                STATUS: item.Status || item.STATUS || "",
                CREATED_ON: item.CreatedOn || item.CREATED_ON || null
            }));

            return res.status(200).json(mappedResults);
        } else {
            throw new Error('SAP did not return an array of incidents.');
        }

    } catch (error) {
        console.warn(`[${new Date().toISOString()}] SAP Incident OData fetch failed, shifting to local mock data:`, error.message);
        
        // Fallback: Read local mock file
        const mockFilePath = path.join(__dirname, '../webapp/model/mockData/Incidents.json');
        fs.readFile(mockFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Failed to read local Incidents.json mock data:', err);
                return res.status(500).json({ error: 'Failed to retrieve incident logs.' });
            }
            
            try {
                const incidents = JSON.parse(data);
                return res.status(200).json(incidents);
            } catch (parseErr) {
                console.error('Failed to parse Incidents mock JSON:', parseErr);
                return res.status(500).json({ error: 'Failed to parse incident mock data.' });
            }
        });
    }
};
