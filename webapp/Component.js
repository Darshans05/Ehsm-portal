sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], function (UIComponent, JSONModel, Device) {
    "use strict";

    return UIComponent.extend("ehsm.portal.Component", {
        metadata: {
            manifest: "json"
        },

        /**
         * Lifecycle initialization method called automatically by UI5 at startup.
         */
        init: function () {
            // Execute base class initialization
            UIComponent.prototype.init.apply(this, arguments);

            // Initialize and configure device model (responsive bindings)
            var oDeviceModel = new JSONModel(Device);
            oDeviceModel.setDefaultBindingMode("OneWay");
            this.setModel(oDeviceModel, "device");

            // Launch page routing
            this.getRouter().initialize();
        }
    });
});
