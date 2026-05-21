sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("ehsm.portal.controller.Login", {
        /**
         * Focus on the Employee ID input automatically on view init
         */
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("login").attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Runs every time the login route is matched.
         * If the user already has an active session, push them to the dashboard
         * and replace the history entry so the back button cannot return here.
         */
        _onRouteMatched: function () {
            var oAppUser = this.getOwnerComponent().getModel("appUser");
            if (!oAppUser) {
                oAppUser = sap.ui.getCore().getModel("appUser");
            }
            if (oAppUser && oAppUser.getProperty("/loggedIn")) {
                // Replace this history entry so back-button won't re-show login
                window.history.replaceState(null, "", window.location.href);
                this.getOwnerComponent().getRouter().navTo("dashboard", {}, true);
                return;
            }
            // Fresh visit — focus the Employee ID input
            var oInput = this.getView().byId("empIdInput");
            if (oInput) {
                setTimeout(function () { oInput.focus(); }, 100);
            }
        },

        onInputChange: function (oEvent) {
            oEvent.getSource().setValueState("None");
        },

        /**
         * Validates inputs and performs dynamic backend verification
         */
        onLoginPress: function () {
            var oView = this.getView();
            var sEmpId = oView.byId("empIdInput").getValue().trim();
            var sPassword = oView.byId("passwordInput").getValue();
            var oRouter = this.getOwnerComponent().getRouter();
            var oLoginBtn = oView.byId("loginBtn");

            // Input validations
            if (!sEmpId) {
                oView.byId("empIdInput").setValueState("Error");
                oView.byId("empIdInput").setValueStateText("Employee ID is required");
                return;
            }

            if (!sPassword) {
                oView.byId("passwordInput").setValueState("Error");
                oView.byId("passwordInput").setValueStateText("Security Password is required");
                return;
            }

            // Set button busy state during network request
            oLoginBtn.setBusy(true);
            var that = this;

            // Execute REST Gateway POST to validate credentials dynamically against SAP Gateway Client
            jQuery.ajax({
                url: "/api/login",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({
                    username: sEmpId,
                    password: sPassword
                }),
                success: function (oData) {
                    oLoginBtn.setBusy(false);

                    if (oData && oData.success) {
                        MessageToast.show(oData.message || "Login Successful!");

                        // Initialize global user model for active session
                        var oAppUserModel = new JSONModel({
                            empId: oData.empId || sEmpId,
                            role: oData.role || "Safety Engineer",
                            loggedIn: true,
                            mode: oData.mode || "Live"
                        });
                        
                        // Set model on both owner component and core for maximum compatibility in XML views
                        that.getOwnerComponent().setModel(oAppUserModel, "appUser");
                        sap.ui.getCore().setModel(oAppUserModel, "appUser");

                        // Clear inputs
                        that._clearInputs();

                        // Replace the login history entry before navigating so the browser
                        // back button from the dashboard exits the app, not back to login.
                        window.history.replaceState(null, "", window.location.href);
                        oRouter.navTo("dashboard", {}, true);
                    } else {
                        MessageBox.error(oData.message || "Invalid Employee credentials.");
                    }
                },
                error: function (oErr) {
                    oLoginBtn.setBusy(false);
                    var sErrMsg = "Connection Error: Failed to contact EHSM authentication service.";
                    if (oErr.responseJSON && oErr.responseJSON.message) {
                        sErrMsg = oErr.responseJSON.message;
                    }
                    MessageBox.error(sErrMsg, {
                        title: "Authentication Failed"
                    });
                }
            });
        },

        _clearInputs: function () {
            this.getView().byId("empIdInput").setValue("");
            this.getView().byId("passwordInput").setValue("");
            this.getView().byId("empIdInput").setValueState("None");
            this.getView().byId("passwordInput").setValueState("None");
        }
    });
});
