sap.ui.define([],
	function() {
		"use strict";

		var LineChartRenderer = {
			apiVersion: 2
		};
	
		LineChartRenderer.render = function(oRm, oControl) {
			oRm.openStart("div", oControl);
			oRm.openEnd();
			oRm.close("div");
		};
	
		return LineChartRenderer;
   }, true);