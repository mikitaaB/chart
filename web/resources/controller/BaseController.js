sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (Controller) {
	"use strict";

	return Controller.extend("my.chart.web.controller.BaseController", {

		getModel: function(sName) {
			return this.getView().getModel(sName);
		},

		setModel: function(oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		sentRequest: function(sMethod, sUrl, oData, fnSuccess, fnError) {
			var promise = jQuery.ajax({
				"url": sUrl,
				"method": sMethod,
				"data": sMethod.toUpperCase().indexOf("GET") === 0 ? oData : JSON.stringify(oData),
				"contentType": "application/json;charset=UTF-8",
				"context": this
			});
			if (fnSuccess) {
				promise.done(fnSuccess);
			}
			if (fnError) {
				promise.fail(fnError);
			}
			return promise;
		}
	});
});