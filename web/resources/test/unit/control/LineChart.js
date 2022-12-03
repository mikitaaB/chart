/*LineChart control controller QUnit*/
/*global QUnit sinon */
sap.ui.define([
	"sap/ui/model/json/JSONModel",
 	"my/chart/web/control/LineChart",
	"sap/ui/core/format/DateFormat",
	"sap/ui/core/Locale",
 	"sap/ui/thirdparty/sinon",
	"sap/ui/thirdparty/sinon-qunit"
], function (JSONModel, LineChartControl, DateFormat, Locale) {
	"use strict";

	QUnit.module("LineChart control", {
		beforeEach: function () {
			this.LineChart = LineChartControl.prototype;
			this.LineChartControl = LineChartControl;
		},
		afterEach: function () {

		}
	});

	QUnit.test("Test _getNotHiddenTypes function", function (assert) {
		var oDataVis = {
			getData: this.stub().returns({
				bIsVisConfirmedLine: false,
				bIsVisRecoveredLine: false,
				bIsVisDeathsLine: false
			})
		};
		var oControllerStub = {
			getModel: sinon.stub().withArgs("lineVisibleModel").returns(oDataVis),
			aLineTypes: ["Confirmed", "Recovered", "Deaths"]
		};
		var fnIsolatedFunction = this.LineChart._getNotHiddenTypes.bind(oControllerStub);
		assert.strictEqual(JSON.stringify(fnIsolatedFunction()), JSON.stringify(["CONFIRMED", "RECOVERED", "DEATHS"]), "All lines are not hiden.");

		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedLine: true,
			bIsVisRecoveredLine: true,
			bIsVisDeathsLine: true
		});
		assert.strictEqual(JSON.stringify(fnIsolatedFunction()), JSON.stringify([]), "All lines are hiden.");

		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedLine: false,
			bIsVisRecoveredLine: false,
			bIsVisDeathsLine: true
		});
		assert.strictEqual(JSON.stringify(fnIsolatedFunction()), JSON.stringify(["CONFIRMED", "RECOVERED"]), "Confirmed and recovered are not hiden.");
	});

	QUnit.test("Test _getTooltipData function", function (assert) {
		var oDataVis = {
			getData: this.stub().returns({
				bIsVisConfirmedLine: false,
				bIsVisRecoveredLine: false,
				bIsVisDeathsLine: false
			})
		};
		var oLocale = new Locale(sap.ui.getCore().getConfiguration().getLanguage());
		var oControllerStub = {
			getModel: sinon.stub().withArgs("lineVisibleModel").returns(oDataVis),
			aLineTypes: ["Confirmed", "Recovered", "Deaths"],
			oDateFormat: DateFormat.getDateInstance({
				format: "yMMMd"
			}, oLocale),
			getConfirmedText: sinon.stub().returns("Confirmed"),
			getRecoveredText: sinon.stub().returns("Recovered"),
			getDeathsText: sinon.stub().returns("Deaths"),
			getSickText: sinon.stub().returns("Sick")
		};
		var fnIsolatedFunction = this.LineChart._getTooltipData.bind(oControllerStub);
		var oDayData = {
			CONFIRMED: 3728,
			DATE: new Date("04-15-2020"),
			DEATHS: 36,
			ID: 25,
			RECOVERED: 203
		};
		var sTooltipResult = "Apr 15, 2020<br/>Confirmed: 3728<br/>Recovered: 203<br/>Deaths: 36<br/>Sick: 3489<br/>";
		assert.strictEqual(fnIsolatedFunction(oDayData), sTooltipResult, "Get tooltip data. All lines are visible");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedLine: true,
			bIsVisRecoveredLine: true,
			bIsVisDeathsLine: false
		});
		var oNewTestData = {
			CONFIRMED: 64604,
			DATE: new Date("07-10-2020"),
			DEATHS: 454,
			ID: 800,
			RECOVERED: 54254
		};
		var sNewTooltipResult = "Jul 10, 2020<br/>Deaths: 454<br/>Sick: 9896<br/>";
		assert.strictEqual(fnIsolatedFunction(oNewTestData), sNewTooltipResult, "Get tooltip data. Only deaths line is visible");
	});

	QUnit.test("Test _getMinDateForScale function", function (assert) {
		var oDataVis = {
			getData: this.stub().returns({
				bIsVisConfirmedLine: false,
				bIsVisRecoveredLine: false,
				bIsVisDeathsLine: false
			})
		};
		var oControllerStub = {
			getModel: sinon.stub().withArgs("lineVisibleModel").returns(oDataVis),
			sMonthly: "Monthly",
			sTypePeriod: "Daily",
			aLineTypes: ["Confirmed", "Recovered", "Deaths"],
			aFilteredData: [
				{
					"TIMESERIESID": "1",
					"COUNTRYCODE": "BY",
					"DATE": "2020-02-28",
					"CONFIRMED": 1,
					"RECOVERED": 0,
					"DEATHS": 0
				},
				{
					"TIMESERIESID": "2",
					"COUNTRYCODE": "BY",
					"DATE": "2020-03-28",
					"CONFIRMED": 200,
					"RECOVERED": 50,
					"DEATHS": 0
				},
				{
					"TIMESERIESID": "3",
					"COUNTRYCODE": "BY",
					"DATE": "2020-04-25",
					"CONFIRMED": 2000,
					"RECOVERED": 500,
					"DEATHS": 5
				},
				{
					"TIMESERIESID": "4",
					"COUNTRYCODE": "BY",
					"DATE": "2020-05-28",
					"CONFIRMED": 20000,
					"RECOVERED": 5000,
					"DEATHS": 10
				},
				{
					"TIMESERIESID": "5",
					"COUNTRYCODE": "BY",
					"DATE": "2020-06-28",
					"CONFIRMED": 40000,
					"RECOVERED": 20000,
					"DEATHS": 100
				}
			]
		};
		oControllerStub._getNotHiddenTypes = this.LineChart._getNotHiddenTypes.bind(oControllerStub);
		var fnIsolatedFunction = this.LineChart._getMinDateForScaleX.bind(oControllerStub);
		assert.strictEqual(fnIsolatedFunction(), "2020-02-28", "All lines are visible.");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedLine: true,
			bIsVisRecoveredLine: false,
			bIsVisDeathsLine: false
		});
		assert.strictEqual(fnIsolatedFunction(), "2020-03-28", "Confirmed line is hiden.");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedLine: true,
			bIsVisRecoveredLine: true,
			bIsVisDeathsLine: false
		});
		assert.strictEqual(fnIsolatedFunction(), "2020-04-25", "Confirmed and recovered lines are hiden.");
	});

	QUnit.test("Test _getMaxY function", function (assert) {
		var oDataVis = {
			getData: this.stub().returns({
				bIsVisConfirmedLine: false,
				bIsVisRecoveredLine: false,
				bIsVisDeathsLine: false
			})
		};
		var oControllerStub = {
			getModel: sinon.stub().withArgs("lineVisibleModel").returns(oDataVis),
			sMonthly: "Monthly",
			sTypePeriod: "Daily",
			aLineTypes: ["Confirmed", "Recovered", "Deaths"],
			aFilteredData: [
				{
					"TIMESERIESID": "1",
					"COUNTRYCODE": "BY",
					"DATE": new Date("2020-02-28"),
					"CONFIRMED": 1,
					"RECOVERED": 0,
					"DEATHS": 0
				},
				{
					"TIMESERIESID": "2",
					"COUNTRYCODE": "BY",
					"DATE": new Date("2020-03-28"),
					"CONFIRMED": 200,
					"RECOVERED": 50,
					"DEATHS": 0
				},
				{
					"TIMESERIESID": "3",
					"COUNTRYCODE": "BY",
					"DATE": new Date("2020-04-25"),
					"CONFIRMED": 2000,
					"RECOVERED": 500,
					"DEATHS": 5
				},
				{
					"TIMESERIESID": "4",
					"COUNTRYCODE": "BY",
					"DATE": new Date("2020-05-28"),
					"CONFIRMED": 20000,
					"RECOVERED": 5000,
					"DEATHS": 10
				},
				{
					"TIMESERIESID": "5",
					"COUNTRYCODE": "BY",
					"DATE": new Date("2020-06-28"),
					"CONFIRMED": 40000,
					"RECOVERED": 25000,
					"DEATHS": 100
				}
			]
		};
		var fnScaleXLine = d3.scaleTime()
			.domain(d3.extent(oControllerStub.aFilteredData, function(oData) {
				return oData.DATE;
			}));
		var fnIsolatedFunction = this.LineChart._getMaxY.bind(oControllerStub);
		assert.strictEqual(fnIsolatedFunction(fnScaleXLine), 40000, "All lines are visible.");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedLine: true,
			bIsVisRecoveredLine: false,
			bIsVisDeathsLine: false
		});
		assert.strictEqual(fnIsolatedFunction(fnScaleXLine), 25000, "Confirmed line is hiden.");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedLine: true,
			bIsVisRecoveredLine: true,
			bIsVisDeathsLine: false
		});
		assert.strictEqual(fnIsolatedFunction(fnScaleXLine), 100, "Confirmed and recovered lines are hiden.");
	});
});