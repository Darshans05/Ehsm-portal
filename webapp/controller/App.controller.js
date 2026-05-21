sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("ehsm.portal.controller.App", {
        onInit: function () {
            // Apply compact or cozy content density style class dynamically if needed
            this.getView().addStyleClass("sapUiSizeCompact");
        }
    });
});
