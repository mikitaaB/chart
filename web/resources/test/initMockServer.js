sap.ui.define([
	"../localService/mockserver"
], function (mockserver) {
	"use strict";

	mockserver.init("../localService/data.json");

	sap.ui.require(["sap/ui/core/ComponentSupport"]);
});