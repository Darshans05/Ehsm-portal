sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "ehsm/portal/utils/Formatter"
], function (Controller, JSONModel, Formatter) {
    "use strict";

    return Controller.extend("ehsm.portal.controller.Risk", {
        formatter: Formatter,

        /**
         * Initialize Route matched pattern listener and KPI model
         */
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("risk").attachPatternMatched(this._onRouteMatched, this);

            // Local view state model to hold match totals
            var oKPIModel = new JSONModel({
                filteredCount: 0
            });
            this.getView().setModel(oKPIModel, "kpis");
        },

        /**
         * Route match validation
         */
        _onRouteMatched: function () {
            // Retrieve session model
            var oAppUser = this.getOwnerComponent().getModel("appUser");
            if (!oAppUser) {
                oAppUser = sap.ui.getCore().getModel("appUser");
            }
            if (!oAppUser || !oAppUser.getProperty("/loggedIn")) {
                // Replace history so the forward-button cannot re-enter this protected route
                this.getOwnerComponent().getRouter().navTo("login", {}, true);
                return;
            }

            this._loadRisks();
        },

        /**
         * Dynamic data cache loader
         */
        _loadRisks: function () {
            var that = this;

            // Fetch Cached datasets from Component model or trigger standalone fetch
            var oEHSMData = this.getOwnerComponent().getModel("ehsmData");
            if (!oEHSMData) {
                oEHSMData = sap.ui.getCore().getModel("ehsmData");
            }

            if (oEHSMData) {
                var aRisks = oEHSMData.getProperty("/risks") || [];
                that._bindRisks(aRisks);
            } else {
                // Standalone fallback fetch
                this.getView().setBusy(true);
                jQuery.ajax({
                    url: "/api/risks",
                    method: "GET",
                    success: function (aRisks) {
                        that.getView().setBusy(false);
                        that._bindRisks(aRisks);
                    },
                    error: function () {
                        that.getView().setBusy(false);
                        that._bindRisks([]);
                    }
                });
            }
        },

        _bindRisks: function (aRisks) {
            this._aOriginalRisks = aRisks || []; // Cache original array
            
            var oRiskModel = new JSONModel(this._aOriginalRisks);
            this.getView().setModel(oRiskModel, "risks");

            // Extract unique filter dropdown values dynamically from the backend dataset
            var aPlants = [];
            var aRiskLevels = [];
            var aStatuses = [];

            var oUniquePlants = {};
            var oUniqueRiskLevels = {};
            var oUniqueStatuses = {};

            this._aOriginalRisks.forEach(function (rsk) {
                // 1. Extract Unique Plant Location Keys & Labels
                if (rsk.PLANT_ID && !oUniquePlants[rsk.PLANT_ID]) {
                    oUniquePlants[rsk.PLANT_ID] = true;
                    var sCleanText = rsk.PLANT_ID;
                    if (sCleanText.indexOf("PLANT-") === 0) {
                        sCleanText = "Plant - " + sCleanText.substring(6);
                    }
                    aPlants.push({
                        key: rsk.PLANT_ID,
                        text: sCleanText + " (" + rsk.PLANT_ID + ")"
                    });
                }

                // 2. Extract Unique Risk Rating Levels
                if (rsk.RISK_LEVEL && !oUniqueRiskLevels[rsk.RISK_LEVEL]) {
                    oUniqueRiskLevels[rsk.RISK_LEVEL] = true;
                    aRiskLevels.push({
                        key: rsk.RISK_LEVEL,
                        text: rsk.RISK_LEVEL + " Level"
                    });
                }

                // 3. Extract Unique Mitigation Statuses
                if (rsk.STATUS && !oUniqueStatuses[rsk.STATUS]) {
                    oUniqueStatuses[rsk.STATUS] = true;
                    aStatuses.push({
                        key: rsk.STATUS,
                        text: rsk.STATUS + " Risks"
                    });
                }
            });

            // Sort arrays alphabetically for clean dashboard aesthetics
            aPlants.sort(function (a, b) { return a.text.localeCompare(b.text); });
            aRiskLevels.sort(function (a, b) { return a.text.localeCompare(b.text); });
            aStatuses.sort(function (a, b) { return a.text.localeCompare(b.text); });

            // Set local dropdown options model
            var oFilterOptionsModel = new JSONModel({
                plants: aPlants,
                riskLevels: aRiskLevels,
                statuses: aStatuses
            });
            this.getView().setModel(oFilterOptionsModel, "filterOptions");

            // Apply default initial counts
            this.getView().getModel("kpis").setProperty("/filteredCount", this._aOriginalRisks.length);

            // Apply search/filters
            this._applyFilters();
        },

        onSearch: function () {
            this._applyFilters();
        },

        onFilterChange: function () {
            this._applyFilters();
        },

        onResetFilters: function () {
            var oView = this.getView();
            oView.byId("plantFilter").setSelectedKey("");
            oView.byId("riskLevelFilter").setSelectedKey("");
            oView.byId("statusFilter").setSelectedKey("");
            oView.byId("searchField").setValue("");

            this._applyFilters();
        },

        /**
         * Dynamic multi-criterion filters logic (search query + location + risk level + status)
         */
        _applyFilters: function () {
            if (!this._aOriginalRisks) {
                return;
            }

            var oView = this.getView();
            var sSearch = oView.byId("searchField").getValue().toLowerCase().trim();
            var sPlant = oView.byId("plantFilter").getSelectedKey();
            var sRiskLevel = oView.byId("riskLevelFilter").getSelectedKey();
            var sStatus = oView.byId("statusFilter").getSelectedKey();

            // Filter original list dynamically
            var aFiltered = this._aOriginalRisks.filter(function (rsk) {
                // 1. Search Query filter (matches ID, Type, or Description)
                var bSearchMatch = !sSearch || 
                    (rsk.RISK_ID && rsk.RISK_ID.toLowerCase().indexOf(sSearch) !== -1) ||
                    (rsk.RISK_TYPE && rsk.RISK_TYPE.toLowerCase().indexOf(sSearch) !== -1) ||
                    (rsk.DESCRIPTION && rsk.DESCRIPTION.toLowerCase().indexOf(sSearch) !== -1);

                // 2. Plant combo filter
                var bPlantMatch = !sPlant || (rsk.PLANT_ID === sPlant);

                // 3. Risk Level combo filter
                var bRiskLevelMatch = !sRiskLevel || (rsk.RISK_LEVEL === sRiskLevel);

                // 4. Status combo filter
                var bStatusMatch = !sStatus || (rsk.STATUS === sStatus);

                return bSearchMatch && bPlantMatch && bRiskLevelMatch && bStatusMatch;
            });

            // Bind filtered list back to model
            var oModel = this.getView().getModel("risks");
            if (oModel) {
                oModel.setData(aFiltered);
            }
            this.getView().getModel("kpis").setProperty("/filteredCount", aFiltered.length);
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        },

        onSignOutPress: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            var oAppUser = this.getOwnerComponent().getModel("appUser");
            if (!oAppUser) {
                oAppUser = sap.ui.getCore().getModel("appUser");
            }
            if (oAppUser) {
                oAppUser.setProperty("/loggedIn", false);
                oAppUser.setProperty("/empId", "");
            }
            sap.m.MessageToast.show("Session terminated safely.");
            oRouter.navTo("login", {}, true);
        }
    });
});
