sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "ehsm/portal/utils/Formatter"
], function (Controller, JSONModel, Formatter) {
    "use strict";

    return Controller.extend("ehsm.portal.controller.Incident", {
        formatter: Formatter,

        /**
         * Initialize Route matched pattern listener and KPI model
         */
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("incident").attachPatternMatched(this._onRouteMatched, this);

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

            this._loadIncidents();
        },

        /**
         * Dynamic data cache loader
         */
        _loadIncidents: function () {
            var that = this;

            // Fetch Cached datasets from Component model or trigger standalone fetch
            var oEHSMData = this.getOwnerComponent().getModel("ehsmData");
            if (!oEHSMData) {
                oEHSMData = sap.ui.getCore().getModel("ehsmData");
            }

            if (oEHSMData) {
                var aIncidents = oEHSMData.getProperty("/incidents") || [];
                that._bindIncidents(aIncidents);
            } else {
                // Standalone fallback fetch
                this.getView().setBusy(true);
                jQuery.ajax({
                    url: "/api/incidents",
                    method: "GET",
                    success: function (aIncidents) {
                        that.getView().setBusy(false);
                        that._bindIncidents(aIncidents);
                    },
                    error: function () {
                        that.getView().setBusy(false);
                        that._bindIncidents([]);
                    }
                });
            }
        },

        _bindIncidents: function (aIncidents) {
            this._aOriginalIncidents = aIncidents || []; // Cache original array
            
            var oIncModel = new JSONModel(this._aOriginalIncidents);
            this.getView().setModel(oIncModel, "incidents");

            // Extract unique filter dropdown values dynamically from the backend dataset
            var aPlants = [];
            var aSeverities = [];
            var aStatuses = [];

            var oUniquePlants = {};
            var oUniqueSeverities = {};
            var oUniqueStatuses = {};

            this._aOriginalIncidents.forEach(function (inc) {
                // 1. Extract Unique Plant Location Keys & Labels
                if (inc.PLANT_ID && !oUniquePlants[inc.PLANT_ID]) {
                    oUniquePlants[inc.PLANT_ID] = true;
                    var sCleanText = inc.PLANT_ID;
                    if (sCleanText.indexOf("PLANT-") === 0) {
                        sCleanText = "Plant - " + sCleanText.substring(6);
                    }
                    aPlants.push({
                        key: inc.PLANT_ID,
                        text: sCleanText + " (" + inc.PLANT_ID + ")"
                    });
                }

                // 2. Extract Unique Severity Ratings
                if (inc.SEVERITY && !oUniqueSeverities[inc.SEVERITY]) {
                    oUniqueSeverities[inc.SEVERITY] = true;
                    aSeverities.push({
                        key: inc.SEVERITY,
                        text: inc.SEVERITY + " Severity"
                    });
                }

                // 3. Extract Unique Log Statuses
                if (inc.STATUS && !oUniqueStatuses[inc.STATUS]) {
                    oUniqueStatuses[inc.STATUS] = true;
                    aStatuses.push({
                        key: inc.STATUS,
                        text: inc.STATUS + " Logs"
                    });
                }
            });

            // Sort arrays alphabetically for clean dashboard aesthetics
            aPlants.sort(function (a, b) { return a.text.localeCompare(b.text); });
            aSeverities.sort(function (a, b) { return a.text.localeCompare(b.text); });
            aStatuses.sort(function (a, b) { return a.text.localeCompare(b.text); });

            // Set local dropdown options model
            var oFilterOptionsModel = new JSONModel({
                plants: aPlants,
                severities: aSeverities,
                statuses: aStatuses
            });
            this.getView().setModel(oFilterOptionsModel, "filterOptions");

            // Apply default initial counts
            this.getView().getModel("kpis").setProperty("/filteredCount", this._aOriginalIncidents.length);

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
            oView.byId("severityFilter").setSelectedKey("");
            oView.byId("statusFilter").setSelectedKey("");
            oView.byId("searchField").setValue("");

            this._applyFilters();
        },

        /**
         * Dynamic multi-criterion filters logic (search query + location + severity + status)
         */
        _applyFilters: function () {
            if (!this._aOriginalIncidents) {
                return;
            }

            var oView = this.getView();
            var sSearch = oView.byId("searchField").getValue().toLowerCase().trim();
            var sPlant = oView.byId("plantFilter").getSelectedKey();
            var sSeverity = oView.byId("severityFilter").getSelectedKey();
            var sStatus = oView.byId("statusFilter").getSelectedKey();

            // Filter original list dynamically
            var aFiltered = this._aOriginalIncidents.filter(function (inc) {
                // 1. Search Query filter (matches ID, Type, or Description)
                var bSearchMatch = !sSearch || 
                    (inc.INCIDENT_ID && inc.INCIDENT_ID.toLowerCase().indexOf(sSearch) !== -1) ||
                    (inc.INCIDENT_TYPE && inc.INCIDENT_TYPE.toLowerCase().indexOf(sSearch) !== -1) ||
                    (inc.DESCRIPTION && inc.DESCRIPTION.toLowerCase().indexOf(sSearch) !== -1);

                // 2. Plant combo filter
                var bPlantMatch = !sPlant || (inc.PLANT_ID === sPlant);

                // 3. Severity combo filter
                var bSeverityMatch = !sSeverity || (inc.SEVERITY === sSeverity);

                // 4. Status combo filter
                var bStatusMatch = !sStatus || (inc.STATUS === sStatus);

                return bSearchMatch && bPlantMatch && bSeverityMatch && bStatusMatch;
            });

            // Bind filtered list back to model
            var oModel = this.getView().getModel("incidents");
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
