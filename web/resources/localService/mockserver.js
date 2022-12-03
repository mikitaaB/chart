sap.ui.define([
	"sap/ui/core/util/MockServer",
	"sap/ui/model/json/JSONModel"
], function (MockServer, JSONModel) {
	"use strict";

	return {
		init: function (sPath) {
			var oModel = new JSONModel();
			oModel.loadData(sPath, {}, false);
			var oMockData = oModel.getData();

			var oMyRequest = [{
				method: "GET",
				path: "/chartType/en",
				response: function (oXhr) {
					oXhr.respondJSON(200, {}, oMockData.chartType);
				}
			}, {
				method: "GET",
				path: "/periodType/en",
				response: function (oXhr) {
					oXhr.respondJSON(200, {}, oMockData.periodType);
				}
			}, {
				method: "GET",
				path: "/country/en",
				response: function (oXhr) {
					oXhr.respondJSON(200, {}, oMockData.country);
				}
			}, {
				method: "GET",
				path: "/timeseries/BY",
				response: function (oXhr) {
					oXhr.respondJSON(200, {}, oMockData.timeseries);
				}
			}];

			var oMockServer = new MockServer({
				rootUri: "/api",
				requests: oMyRequest
			});
			oMockServer.start();
		}
	};
});