sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"my/chart/web/model/models"
], function (UIComponent, Device, models) {
	"use strict";

	return UIComponent.extend("my.chart.web.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// set language without coutry code
			var oConfig = sap.ui.getCore().getConfiguration();
			var sLang = oConfig.getLanguage().split("-")[0];
			oConfig.setLanguage(sLang);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
		}
	});
});