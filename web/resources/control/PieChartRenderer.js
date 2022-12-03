sap.ui.define([],
	function() {
		"use strict";

		var PieChartRenderer = {
			apiVersion: 2
		};
	
		PieChartRenderer.render = function(oRm, oControl) {
			oRm.openStart("div", oControl);
			oRm.openEnd();
			oRm.close("div");
		};
	
		return PieChartRenderer;
   }, true);