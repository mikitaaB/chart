/*global QUnit, opaTest*/

sap.ui.define([
	"my/chart/web/localService/mockserver",
	"sap/ui/test/opaQunit",
	"./pages/App"
], function (mockserver) {
	"use strict";

	var sChartTypeSelectId = "idChartTypeSelect";
	var sCountrySelectId = "idCountrySelect";
	var sPeriodTypeSelectId = "idPeriodTypeSelect";
	var sDateTypesComboboxId = "idDataTypesMultiCombobox";
	var sDateFromId = "idDateFrom";
	var sDateToId = "idDateTo";
	var sLangRuButton = "idChangeLangRuButton";
	var sLangEnButton = "idChangeLangEnButton";
	var sLineChartId = "idLineChart";
	var sBarChartId = "idBarChart";
	var sLineChartKey = "Line";
	var sBarChartKey = "Bar";
	var sSuccessSelect = "Select is found";
	var sErrorSelect = "Select is not found";
	var sSuccessChart = "Chart is found";
	var sErrorChart = "Chart is not found";
	var sControlItemCountSuccessMessage = "Control has all items";
	var sControlItemCountErrorMessage = "Control has't all items";

	QUnit.module("D3 Chart");
	
	opaTest("AppPage opa testing", function(Given, When, Then) {
		mockserver.init("../../localService/data.json");

		Given.iStartMyUIComponent({
			"componentConfig": {
				name: "my.chart.web",
				async: false
			}
		});

		Then.onAppPage.iFindElementById(sChartTypeSelectId, sSuccessSelect, sErrorSelect);
		Then.onAppPage.iFindElementById(sCountrySelectId, sSuccessSelect, sErrorSelect);
		Then.onAppPage.iFindElementById(sPeriodTypeSelectId, sSuccessSelect, sErrorSelect);
		Then.onAppPage.iFindElementById(sDateTypesComboboxId, sSuccessSelect, sErrorSelect);
		Then.onAppPage.iFindElementById(sDateFromId, sSuccessSelect, sErrorSelect);
		Then.onAppPage.iFindElementById(sDateToId, sSuccessSelect, sErrorSelect);
		Then.onAppPage.iFindElementById(sLangRuButton, sSuccessSelect, sErrorSelect);
		Then.onAppPage.iFindElementById(sLangEnButton, sSuccessSelect, sErrorSelect);

		// Check count entries in controls (select, multiCombobox)
		Then.onAppPage.theControlHasEntries(sChartTypeSelectId, 2, sControlItemCountSuccessMessage, sControlItemCountErrorMessage);
		Then.onAppPage.theControlHasEntries(sCountrySelectId, 6, sControlItemCountSuccessMessage, sControlItemCountErrorMessage);
		Then.onAppPage.theControlHasEntries(sPeriodTypeSelectId, 2, sControlItemCountSuccessMessage, sControlItemCountErrorMessage);
		Then.onAppPage.theControlHasEntries(sDateTypesComboboxId, 3, sControlItemCountSuccessMessage, sControlItemCountErrorMessage);

		// Change types of charts. Сheck their visibility
		When.onAppPage.iShowAnotherChart(sChartTypeSelectId, sLineChartKey, sErrorSelect);
		Then.onAppPage.iFindElementById(sLineChartId, sSuccessChart, sErrorChart);
		When.onAppPage.iShowAnotherChart(sChartTypeSelectId, sBarChartKey, sErrorSelect);
		Then.onAppPage.iFindElementById(sBarChartId, sSuccessChart, sErrorChart);
		When.onAppPage.iShowAnotherChart(sChartTypeSelectId, sLineChartKey, sErrorSelect);
		Then.onAppPage.iFindElementById(sLineChartId, sSuccessChart, sErrorChart);
	});
});