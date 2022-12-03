sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/matchers/AggregationLengthEquals"
], function (Opa5, Press, AggregationLengthEquals) {
	"use strict";

	var sViewName = "my.chart.web.view.App";

	Opa5.createPageObjects({
		onAppPage: {
			actions: {
				iPressSelect: function (sControlId, sErrorMessage) {
					return this.waitFor({
						id: sControlId,
						viewName: sViewName,
						actions: new Press(),
						errorMessage: sErrorMessage
					});
				},

				iShowAnotherChart: function(sControlId, sKey, sErrorMessage) {
					return this.waitFor({
						id: sControlId,
						viewName: sViewName,
						actions: function (oSelect) {
							oSelect.setSelectedKey(sKey);
							oSelect.fireEvent("change");
						},
						errorMessage: sErrorMessage
					});
				}
			},

			assertions: {
				iFindElementById: function(sComponentId, sSuccessMessage, sErrorMessage) {
					return this.waitFor({
						id: sComponentId,
						autoWait: false,
						viewName: sViewName,
						success: function () {
							Opa5.assert.ok(true, sComponentId + " " + sSuccessMessage);
						},
						errorMessage: sComponentId + " " + sErrorMessage
					});
				},

				theControlHasEntries: function(sControlId, iLength, sSuccessMessage, sErrorMessage) {
					return this.waitFor({
						id: sControlId,
						viewName: sViewName,
						matchers: new AggregationLengthEquals({
							"name": "items",
							"length": iLength
						}),
						success: function () {
							Opa5.assert.ok(true, sSuccessMessage);
						},
						errorMessage: sErrorMessage
					});
				}
			}
		}
	});
});