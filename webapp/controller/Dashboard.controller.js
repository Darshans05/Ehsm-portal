sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("ehsm.portal.controller.Dashboard", {
        /**
         * Setup routes matching pattern listeners and bind Mock Plant Safety details
         */
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("dashboard").attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Route matched authorization check. Ensures dynamic login is established before load.
         */
        _onRouteMatched: function () {
            // Retrieve session model from Component
            var oAppUser = this.getOwnerComponent().getModel("appUser");
            if (!oAppUser) {
                oAppUser = sap.ui.getCore().getModel("appUser");
            }

            if (!oAppUser || !oAppUser.getProperty("/loggedIn")) {
                MessageToast.show("Access denied: Active session required.");
                // Replace history so the protected route is never reachable via forward-button
                this.getOwnerComponent().getRouter().navTo("login", {}, true);
                return;
            }

            this._loadSafetyData();
        },

        /**
         * Fetch incidents and risks concurrently, caching them in both Component and Core
         */
        _loadSafetyData: function () {
            var that = this;
            this.getView().setBusy(true);

            // Fetch incidents from Express REST Gateway
            var pIncidents = new Promise(function (resolve, reject) {
                jQuery.ajax({
                    url: "/api/incidents",
                    method: "GET",
                    success: resolve,
                    error: reject
                });
            });

            // Fetch risk assessments from Express REST Gateway
            var pRisks = new Promise(function (resolve, reject) {
                jQuery.ajax({
                    url: "/api/risks",
                    method: "GET",
                    success: resolve,
                    error: reject
                });
            });

            // Concurrently resolve API metrics
            Promise.all([pIncidents, pRisks]).then(function (aResults) {
                that.getView().setBusy(false);

                var aIncidents = aResults[0] || [];
                var aRisks = aResults[1] || [];

                // 1. Initialize and cache datasets globally in both Component and Core
                var oEHSMDataModel = new JSONModel({
                    incidents: aIncidents,
                    risks: aRisks
                });
                
                that.getOwnerComponent().setModel(oEHSMDataModel, "ehsmData");
                sap.ui.getCore().setModel(oEHSMDataModel, "ehsmData");

                // 2. Calculate real-time safety KPIs
                var iTotalIncidents = aIncidents.length;
                var iTotalRisks = aRisks.length;

                var iOpenIncidents = aIncidents.filter(function (inc) {
                    return inc.STATUS && inc.STATUS.toUpperCase() !== "CLOSED";
                }).length;

                var iHighRisks = aRisks.filter(function (rsk) {
                    return rsk.RISK_LEVEL && (rsk.RISK_LEVEL.toUpperCase() === "HIGH" || rsk.RISK_LEVEL.toUpperCase() === "CRITICAL");
                }).length;

                // 3. Set KPI models on the view
                var oKPIModel = new JSONModel({
                    totalIncidents: iTotalIncidents,
                    totalRisks: iTotalRisks,
                    openIncidents: iOpenIncidents,
                    highRisks: iHighRisks
                });
                that.getView().setModel(oKPIModel, "kpis");

                // 4. Dynamically compute Plant Safety Compliance Audits summary list
                var oPlantsMap = {};
                
                // Aggregate Incidents count for each plant
                aIncidents.forEach(function (inc) {
                    var sPlant = inc.PLANT_ID || "Unknown";
                    if (!oPlantsMap[sPlant]) {
                        oPlantsMap[sPlant] = { location: sPlant, incidents: 0, highRisks: 0 };
                    }
                    if (inc.STATUS && inc.STATUS.toUpperCase() !== "CLOSED") {
                        oPlantsMap[sPlant].incidents += 1;
                    }
                });

                // Aggregate High Risks count for each plant
                aRisks.forEach(function (rsk) {
                    var sPlant = rsk.PLANT_ID || "Unknown";
                    if (!oPlantsMap[sPlant]) {
                        oPlantsMap[sPlant] = { location: sPlant, incidents: 0, highRisks: 0 };
                    }
                    if (rsk.RISK_LEVEL && (rsk.RISK_LEVEL.toUpperCase() === "HIGH" || rsk.RISK_LEVEL.toUpperCase() === "CRITICAL")) {
                        oPlantsMap[sPlant].highRisks += 1;
                    }
                });

                // Map data to the view compliance structure
                var aPlantSafety = Object.keys(oPlantsMap).map(function (sKey) {
                    var oPlantData = oPlantsMap[sKey];
                    var sLoc = oPlantData.location;
                    var sCleanText = sLoc;
                    if (sCleanText.indexOf("PLANT-") === 0) {
                        sCleanText = "Plant - " + sCleanText.substring(6);
                    } else if (sCleanText.match(/^\d+$/)) {
                        sCleanText = "Plant - " + sCleanText;
                    }

                    var sStatus = "Excellent";
                    var sState = "Success";
                    var sFlagged = "Hide";

                    if (oPlantData.highRisks > 0) {
                        sStatus = "Caution Required";
                        sState = "Warning";
                        sFlagged = "Flagged";
                    } else if (oPlantData.incidents > 1) {
                        sStatus = "Good";
                        sState = "Success";
                        sFlagged = "Hide";
                    }

                    return {
                        location: sCleanText + " (" + sLoc + ")",
                        status: sStatus,
                        state: sState,
                        incidents: oPlantData.incidents,
                        highRisks: oPlantData.highRisks,
                        flagged: sFlagged
                    };
                });

                // Sort plant summaries alphabetically
                aPlantSafety.sort(function (a, b) { return a.location.localeCompare(b.location); });

                // Update the data model bound to compliance table
                var oPlantModel = that.getView().getModel();
                if (oPlantModel) {
                    oPlantModel.setProperty("/plantSafety", aPlantSafety);
                } else {
                    oPlantModel = new JSONModel({ plantSafety: aPlantSafety });
                    that.getView().setModel(oPlantModel);
                }

            }).catch(function (oErr) {
                that.getView().setBusy(false);
                console.error("Dashboard REST fetches failed:", oErr);
                MessageToast.show("REST Gateway connection lost. Operating in limited visibility.");
            });
        },

        onNavigateToIncidents: function () {
            this.getOwnerComponent().getRouter().navTo("incident");
        },

        onNavigateToRisks: function () {
            this.getOwnerComponent().getRouter().navTo("risk");
        },

        /**
         * Clears global context models on dynamic signout
         */
        onSignOutPress: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            
            // Terminate active session model
            var oAppUser = this.getOwnerComponent().getModel("appUser");
            if (!oAppUser) {
                oAppUser = sap.ui.getCore().getModel("appUser");
            }
            if (oAppUser) {
                oAppUser.setProperty("/loggedIn", false);
                oAppUser.setProperty("/empId", "");
            }

            MessageToast.show("Session terminated safely.");
            // Replace history so forward-button cannot re-enter the dashboard
            oRouter.navTo("login", {}, true);
        }
    });
});
