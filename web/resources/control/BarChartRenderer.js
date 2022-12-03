sap.ui.define([],
	function() {
		"use strict";

		var BarChartRenderer = {
			apiVersion: 2
		};
	
		BarChartRenderer.render = function (oRm, oControl) {
			oRm.openStart("div", oControl);
			oRm.openEnd();
			oRm.close("div");
		};
	
		return BarChartRenderer;
   }, true);