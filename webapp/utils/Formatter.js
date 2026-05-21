sap.ui.define([
    "sap/ui/core/format/DateFormat"
], function (DateFormat) {
    "use strict";

    return {
        /**
         * Returns a semantic Fiori ValueState color based on severity string
         * @param {string} sSeverity Severity value
         * @returns {string} Fiori ValueState
         */
        severityState: function (sSeverity) {
            if (!sSeverity) {
                return "None";
            }
            switch (sSeverity.toUpperCase()) {
                case "CRITICAL":
                case "HIGH":
                    return "Error"; // Red
                case "MEDIUM":
                case "WARNING":
                    return "Warning"; // Orange
                case "LOW":
                    return "Success"; // Green
                default:
                    return "None";
            }
        },

        /**
         * Returns a semantic Fiori ValueState color based on status string
         * @param {string} sStatus Status value
         * @returns {string} Fiori ValueState
         */
        statusState: function (sStatus) {
            if (!sStatus) {
                return "None";
            }
            switch (sStatus.toUpperCase()) {
                case "CLOSED":
                case "MITIGATED":
                    return "Success"; // Green
                case "OPEN":
                case "ACTIVE":
                    return "Warning"; // Orange
                case "IN PROGRESS":
                case "NEW":
                case "IDENTIFIED":
                    return "Information"; // Blue
                default:
                    return "None";
            }
        },

        /**
         * Returns an SAP Icon based on severity string
         * @param {string} sSeverity Severity value
         * @returns {string} SAP Icon URI
         */
        severityIcon: function (sSeverity) {
            if (!sSeverity) {
                return "sap-icon://incident";
            }
            switch (sSeverity.toUpperCase()) {
                case "CRITICAL":
                    return "sap-icon://status-error";
                case "HIGH":
                    return "sap-icon://status-critical";
                case "MEDIUM":
                    return "sap-icon://status-inactive";
                case "LOW":
                    return "sap-icon://status-completed";
                default:
                    return "sap-icon://incident";
            }
        },

        /**
         * Formats raw OData timestamp strings or JS Date objects into "dd-MMM-yyyy" format.
         * @param {any} vDate Date object, ISO string, or /Date(xxx)/ string
         * @returns {string} Formatted date string
         */
        formatDate: function (vDate) {
            if (!vDate) {
                return "";
            }
            var oDate = vDate;
            if (typeof vDate === "string") {
                if (vDate.indexOf("Date") !== -1) {
                    var aMatches = vDate.match(/\d+/);
                    if (aMatches && aMatches.length > 0) {
                        oDate = new Date(parseInt(aMatches[0], 10));
                    }
                } else {
                    oDate = new Date(vDate);
                }
            }
            if (!(oDate instanceof Date) || isNaN(oDate.getTime())) {
                return vDate; // Return original if parsing fails
            }
            var oDateFormat = DateFormat.getInstance({
                pattern: "dd-MMM-yyyy"
            });
            return oDateFormat.format(oDate);
        }
    };
});
