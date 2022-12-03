/*BarChart control controller QUnit*/
/*global QUnit sinon */
sap.ui.define([
	"sap/ui/model/json/JSONModel",
 	"my/chart/web/control/BarChart",
	"sap/ui/core/format/DateFormat",
	"sap/ui/core/Locale",
 	"sap/ui/thirdparty/sinon",
	"sap/ui/thirdparty/sinon-qunit"
], function (JSONModel, BarChartControl, DateFormat, Locale) {
	"use strict";

	QUnit.module("BarChart control", {
		beforeEach: function () {
			this.BarChart = BarChartControl.prototype;
			this.BarChartControl = BarChartControl;
		},
		afterEach: function () {

		}
	});

	QUnit.test("Test _getNotHiddenTypes function", function (assert) {
		var oDataVis = {
			getData: this.stub().returns({
				bIsVisConfirmedBar: false,
				bIsVisRecoveredBar: false,
				bIsVisDeathsBar: false
			})
		};
		var oControllerStub = {
			getModel: sinon.stub().withArgs("barVisibleModel").returns(oDataVis),
			aBarTypes: ["Confirmed", "Recovered", "Deaths"]
		};
		var fnIsolatedFunction = this.BarChart._getNotHiddenTypes.bind(oControllerStub);
		assert.strictEqual(JSON.stringify(fnIsolatedFunction()), JSON.stringify(["CONFIRMED", "RECOVERED", "DEATHS"]), "All bars are not hiden.");

		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedBar: true,
			bIsVisRecoveredBar: true,
			bIsVisDeathsBar: true
		});
		assert.strictEqual(JSON.stringify(fnIsolatedFunction()), JSON.stringify([]), "All bars are hiden");

		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedBar: false,
			bIsVisRecoveredBar: false,
			bIsVisDeathsBar: true
		});
		assert.strictEqual(JSON.stringify(fnIsolatedFunction()), JSON.stringify(["CONFIRMED", "RECOVERED"]), "Confirmed and recovered are not hides");
	});

	QUnit.test("Test _getTooltipData function", function (assert) {
		var oDataVis = {
			getData: this.stub().returns({
				bIsVisConfirmedBar: false,
				bIsVisRecoveredBar: false,
				bIsVisDeathsBar: false
			})
		};
		var oLocale = new Locale(sap.ui.getCore().getConfiguration().getLanguage());
		var oControllerStub = {
			getModel: sinon.stub().withArgs("barVisibleModel").returns(oDataVis),
			aBarTypes: ["Confirmed", "Recovered", "Deaths"],
			oDateFormat: DateFormat.getDateInstance({
				format: "yMMMd"
			}, oLocale),
			getConfirmedText: sinon.stub().returns("Confirmed"),
			getRecoveredText: sinon.stub().returns("Recovered"),
			getDeathsText: sinon.stub().returns("Deaths"),
			getSickText: sinon.stub().returns("Sick")
		};
		var fnIsolatedFunction = this.BarChart._getTooltipData.bind(oControllerStub);
		var oTestData = {
			CONFIRMED: 3728,
			DATE: new Date("04-15-2020"),
			DEATHS: 36,
			ID: 25,
			RECOVERED: 203
		};
		var sTooltipResult = "Apr 15, 2020<br/>Confirmed: 3728<br/>Recovered: 203<br/>Deaths: 36<br/>Sick: 3489<br/>";
		assert.strictEqual(fnIsolatedFunction(oTestData), sTooltipResult, "Get tooltip data. All bars are visible");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedBar: true,
			bIsVisRecoveredBar: true,
			bIsVisDeathsBar: false
		});
		var oNewTestData = {
			CONFIRMED: 64604,
			DATE: new Date("07-10-2020"),
			DEATHS: 454,
			ID: 800,
			RECOVERED: 54254
		};
		var sNewTooltipResult = "Jul 10, 2020<br/>Deaths: 454<br/>Sick: 9896<br/>";
		assert.strictEqual(fnIsolatedFunction(oNewTestData), sNewTooltipResult, "Get tooltip data. Only deaths bar is visible");
	});

	QUnit.test("Test _getMaxY function", function (assert) {
		var oDataVis = {
			getData: this.stub().returns({
				bIsVisConfirmedBar: false,
				bIsVisRecoveredBar: false,
				bIsVisDeathsBar: false
			})
		};
		var oControllerStub = {
			getModel: sinon.stub().withArgs("barVisibleModel").returns(oDataVis),
			sMonthly: "Monthly",
			sTypePeriod: "Daily",
			aBarTypes: ["Confirmed", "Recovered", "Deaths"],
			aFilteredBarData: [
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
		var fnScaleX = d3.scaleTime()
			.domain(d3.extent(oControllerStub.aFilteredBarData, function(oData) {
				return oData.DATE;
			}));
		var fnIsolatedFunction = this.BarChart._getMaxY.bind(oControllerStub);
		assert.strictEqual(fnIsolatedFunction(fnScaleX), 40000, "All bars are visible.");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedBar: true,
			bIsVisRecoveredBar: false,
			bIsVisDeathsBar: false
		});
		assert.strictEqual(fnIsolatedFunction(fnScaleX), 25000, "Confirmed bar is hiden.");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedBar: true,
			bIsVisRecoveredBar: true,
			bIsVisDeathsBar: false
		});
		assert.strictEqual(fnIsolatedFunction(fnScaleX), 100, "Confirmed and recovered bars are hiden.");
	});

	QUnit.test("Test _getFilteredBarData function", function (assert) {
		var oControllerStub = {
			aFilteredBarData: [
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
		var aFilterResData = [
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
			}
		];
		oControllerStub.fnScaleXBar = d3.scaleTime()
			.domain(d3.extent(aFilterResData, function(oData) {
				return oData.DATE;
			}));
		var fnIsolatedFunction = this.BarChart._getFilteredBarData.bind(oControllerStub);
		assert.strictEqual(JSON.stringify(fnIsolatedFunction(oControllerStub.aFilteredBarData)), JSON.stringify(aFilterResData), "Filtering data by domain.");
		aFilterResData = [
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
		];
		oControllerStub.fnScaleXBar.domain(d3.extent(aFilterResData, function(oData) {
			return oData.DATE;
		}));
		assert.strictEqual(JSON.stringify(fnIsolatedFunction(oControllerStub.aFilteredBarData)), JSON.stringify(aFilterResData), "Filtering data by domain.");
	});

	QUnit.test("Test _getSortedMonth function", function (assert) {
		var oControllerStub = {
			sMonthly: "Monthly",
			sTypePeriod: "Monthly",
			aSortMonthData: [
				{
					ID: 1, 
					DATE: new Date("2020-02-28"), 
					CONFIRMED: 1, 
					RECOVERED: 0, 
					DEATHS: 0
				},
				{
					ID: 3,
					DATE: new Date("2020-03-01"),
					CONFIRMED: 150,
					RECOVERED: 42,
					DEATHS: 1
				},
				{
					ID: 11,
					DATE: new Date("2020-04-01"),
					CONFIRMED: 13864,
					RECOVERED: 2327,
					DEATHS: 87
				},
				{
					ID: 64,
					DATE: new Date("2020-05-01"),
					CONFIRMED: 15596,
					RECOVERED: 27639,
					DEATHS: 142
				},
				{
					ID: 95,
					DATE: new Date("2020-06-01"),
					CONFIRMED: 27278,
					RECOVERED: 18715,
					DEATHS: 152
				},
				{
					ID: 125,
					DATE: new Date("2020-07-01"),
					CONFIRMED: 14891,
					RECOVERED: 5384,
					DEATHS: 161
				},
				{
					ID: 926,
					DATE: new Date("2020-08-01"),
					CONFIRMED: 6153,
					RECOVERED: 2522,
					DEATHS: 79
				}
			]
		};
		var oDayData = {
			CONFIRMED: 18715,
			DATE: new Date("2020-06-01"),
			DEATHS: 152,
			ID: 95,
			RECOVERED: 27278
		};
		var oDayResData = {
			ID: 95,
			DATE: new Date("2020-06-01"),
			CONFIRMED: 27278,
			RECOVERED: 18715,
			DEATHS: 152
		};
		var fnIsolatedFunction = this.BarChart._getSortedMonth.bind(oControllerStub);
		assert.strictEqual(JSON.stringify(fnIsolatedFunction(oDayData)), JSON.stringify(oDayResData), "Monthly. Get sorted monthly data.");
		oDayResData = oDayData = {
			ID: 11,
			DATE: new Date("2020-04-01"),
			CONFIRMED: 13864,
			RECOVERED: 2327,
			DEATHS: 87
		};
		assert.strictEqual(JSON.stringify(fnIsolatedFunction(oDayData)), JSON.stringify(oDayResData), "Monthly. Get not sorted monthly data.");
		oControllerStub.sTypePeriod = "Daily";
		oDayResData = oDayData = {
			"TIMESERIESID": "5",
			"COUNTRYCODE": "BY",
			"DATE": new Date("2020-06-28"),
			"CONFIRMED": 40000,
			"RECOVERED": 25000,
			"DEATHS": 100
		};
		assert.strictEqual(JSON.stringify(fnIsolatedFunction(oDayData)), JSON.stringify(oDayResData), "Daily. Get the same data.");
	});

	QUnit.test("Test _getHeightOfBar function", function (assert) {
		var oDataVis = {
			getData: this.stub().returns({
				bIsVisConfirmedBar: false,
				bIsVisRecoveredBar: false,
				bIsVisDeathsBar: false
			})
		};
		var oControllerStub = {
			getModel: sinon.stub().withArgs("barVisibleModel").returns(oDataVis),
			sMonthly: "Monthly",
			sTypePeriod: "Daily",
			aBarTypes: ["Confirmed", "Recovered", "Deaths"],
			aFilteredBarData: [
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
		var oDayData = {
			CONFIRMED: 1066,
			DATE: new Date("2020-04-08"),
			DEATHS: 13,
			ID: 18,
			RECOVERED: 77
		};
		var sCurBar = "DEATHS";
		oControllerStub._getNotHiddenTypes = this.BarChart._getNotHiddenTypes.bind(oControllerStub);
		var fnIsolatedFunction = this.BarChart._getHeightOfBar.bind(oControllerStub);
		assert.strictEqual(fnIsolatedFunction(oDayData, sCurBar), 13, "Height of deaths bar.");
		oDayData = {
			CONFIRMED: 26772,
			DATE: new Date("2020-05-14"),
			DEATHS: 151,
			ID: 77,
			RECOVERED: 8168
		};
		sCurBar = "CONFIRMED";
		assert.strictEqual(fnIsolatedFunction(oDayData, sCurBar), 18604, "Height of confirmed bar.");
		oDayData = {
			CONFIRMED: 6153,
			DATE: new Date("2020-08-01"),
			DEATHS: 79,
			ID: 926,
			RECOVERED: 2522
		};
		sCurBar = "RECOVERED";
		assert.strictEqual(fnIsolatedFunction(oDayData, sCurBar), 2443, "Height of recovered bar.");
	});

	QUnit.test("Test _getMaxAllDataY function", function (assert) {
		var oDataVis = {
			getData: this.stub().returns({
				bIsVisConfirmedBar: false,
				bIsVisRecoveredBar: false,
				bIsVisDeathsBar: false
			})
		};
		var oControllerStub = {
			getModel: sinon.stub().withArgs("barVisibleModel").returns(oDataVis),
			sMonthly: "Monthly",
			sTypePeriod: "Daily",
			aBarTypes: ["Confirmed", "Recovered", "Deaths"],
			aFilteredBarData: [
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
			],
			aSortMonthData: [
				{
					ID: 1,
					DATE: new Date("2020-02-28"),
					CONFIRMED: 1,
					RECOVERED: 0,
					DEATHS: 0
				},
				{
					ID: 3,
					DATE: new Date("2020-03-01"),
					CONFIRMED: 150,
					RECOVERED: 42,
					DEATHS: 1
				},
				{
					ID: 11,
					DATE: new Date("2020-04-01"),
					CONFIRMED: 13864,
					RECOVERED: 2327,
					DEATHS: 87
				},
				{
					ID: 64,
					DATE: new Date("2020-05-01"),
					CONFIRMED: 15596,
					RECOVERED: 27639,
					DEATHS: 142
				},
				{
					ID: 95,
					DATE: new Date("2020-06-01"),
					CONFIRMED: 27278,
					RECOVERED: 18715,
					DEATHS: 152
				},
				{
					ID: 125,
					DATE: new Date("2020-07-01"),
					CONFIRMED: 14891,
					RECOVERED: 5384,
					DEATHS: 161
				},
				{
					ID: 926,
					DATE: new Date("2020-08-01"),
					CONFIRMED: 6153,
					RECOVERED: 2522,
					DEATHS: 79
				}
			]
		};
		oControllerStub._getMaxMonthObj = this.BarChart._getMaxMonthObj.bind(oControllerStub);
		oControllerStub._getNotHiddenTypes = this.BarChart._getNotHiddenTypes.bind(oControllerStub);
		var fnIsolatedFunction = this.BarChart._getMaxAllDataY.bind(oControllerStub);
		assert.strictEqual(fnIsolatedFunction(), 40000, "Daily. All bars are visible.");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedBar: true,
			bIsVisRecoveredBar: false,
			bIsVisDeathsBar: false
		});
		assert.strictEqual(fnIsolatedFunction(), 25000, "Daily. Confirmed bar is hiden.");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedBar: true,
			bIsVisRecoveredBar: true,
			bIsVisDeathsBar: false
		});
		assert.strictEqual(fnIsolatedFunction(), 100, "Daily. Confirmed and recovered bars are hiden.");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedBar: false,
			bIsVisRecoveredBar: false,
			bIsVisDeathsBar: false
		});
		oControllerStub.sTypePeriod = "Monthly";
		assert.strictEqual(fnIsolatedFunction(), 27639, "Monthly. All bars are visible.");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedBar: true,
			bIsVisRecoveredBar: true,
			bIsVisDeathsBar: false
		});
		assert.strictEqual(fnIsolatedFunction(), 161, "Monthly. Confirmed and recovered bars are hiden.");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedBar: true,
			bIsVisRecoveredBar: false,
			bIsVisDeathsBar: false
		});
		assert.strictEqual(fnIsolatedFunction(), 27639, "Monthly.  Confirmed bar is hiden.");
	});

	QUnit.test("Test _getMaxKey function", function (assert) {
		var oDataVis = {
			getData: this.stub().returns({
				bIsVisConfirmedBar: false,
				bIsVisRecoveredBar: false,
				bIsVisDeathsBar: false
			})
		};
		var oControllerStub = {
			getModel: sinon.stub().withArgs("barVisibleModel").returns(oDataVis),
			sMonthly: "Monthly",
			sTypePeriod: "Daily",
			aBarTypes: ["Confirmed", "Recovered", "Deaths"],
			aFilteredBarData: [
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
		var oDayData = {
			CONFIRMED: 1066,
			DATE: new Date("2020-04-08"),
			DEATHS: 13,
			ID: 18,
			RECOVERED: 77
		};
		oControllerStub._getNotHiddenTypes = this.BarChart._getNotHiddenTypes.bind(oControllerStub);
		var fnIsolatedFunction = this.BarChart._getMaxKey.bind(oControllerStub);
		assert.strictEqual(fnIsolatedFunction(oDayData), "CONFIRMED", "Confirmed is a key with max value.");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedBar: true,
			bIsVisRecoveredBar: false,
			bIsVisDeathsBar: false
		});
		assert.strictEqual(fnIsolatedFunction(oDayData), "RECOVERED", "Recovered is a key with max value.");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedBar: true,
			bIsVisRecoveredBar: true,
			bIsVisDeathsBar: false
		});
		assert.strictEqual(fnIsolatedFunction(oDayData), "DEATHS", "Deaths is a key with max value.");
	});

	QUnit.test("Test _getMaxMonthObj function", function (assert) {
		var oDataVis = {
			getData: this.stub().returns({
				bIsVisConfirmedBar: false,
				bIsVisRecoveredBar: false,
				bIsVisDeathsBar: false
			})
		};
		var oControllerStub = {
			getModel: sinon.stub().withArgs("barVisibleModel").returns(oDataVis),
			sMonthly: "Monthly",
			sTypePeriod: "Daily",
			aBarTypes: ["Confirmed", "Recovered", "Deaths"],
			aSortMonthData: [
				{
					ID: 1,
					DATE: new Date("2020-02-28"),
					CONFIRMED: 1,
					RECOVERED: 0,
					DEATHS: 0
				},
				{
					ID: 3,
					DATE: new Date("2020-03-01"),
					CONFIRMED: 150,
					RECOVERED: 42,
					DEATHS: 1
				},
				{
					ID: 11,
					DATE: new Date("2020-04-01"),
					CONFIRMED: 13864,
					RECOVERED: 2327,
					DEATHS: 87
				},
				{
					ID: 64,
					DATE: new Date("2020-05-01"),
					CONFIRMED: 15596,
					RECOVERED: 27639,
					DEATHS: 142
				},
				{
					ID: 95,
					DATE: new Date("2020-06-01"),
					CONFIRMED: 27278,
					RECOVERED: 18715,
					DEATHS: 152
				},
				{
					ID: 125,
					DATE: new Date("2020-07-01"),
					CONFIRMED: 14891,
					RECOVERED: 5384,
					DEATHS: 161
				},
				{
					ID: 926,
					DATE: new Date("2020-08-01"),
					CONFIRMED: 6153,
					RECOVERED: 2522,
					DEATHS: 79
				}
			]
		};
		oControllerStub._getNotHiddenTypes = this.BarChart._getNotHiddenTypes.bind(oControllerStub);
		var fnIsolatedFunction = this.BarChart._getMaxMonthObj.bind(oControllerStub);
		var oResObj = {
			ID: 64,
			DATE: new Date("2020-05-01"),
			CONFIRMED: 15596,
			RECOVERED: 27639,
			DEATHS: 142
		};
		var aRes = [oResObj, "RECOVERED"];
		assert.strictEqual(JSON.stringify(fnIsolatedFunction(oControllerStub.aSortMonthData)), JSON.stringify(aRes), "Found a max month from whole segment. All bars are visible.");
		oDataVis.getData = this.stub().returns({
			bIsVisConfirmedBar: true,
			bIsVisRecoveredBar: true,
			bIsVisDeathsBar: false
		});
		oControllerStub.aLimitedMonthData = [
			{
				ID: 125,
				DATE: new Date("2020-07-01"),
				CONFIRMED: 14891,
				RECOVERED: 5384,
				DEATHS: 161
			},
			{
				ID: 926,
				DATE: new Date("2020-08-01"),
				CONFIRMED: 6153,
				RECOVERED: 2522,
				DEATHS: 79
			}
		];
		oResObj = {
			ID: 125,
			DATE: new Date("2020-07-01"),
			CONFIRMED: 14891,
			RECOVERED: 5384,
			DEATHS: 161
		};
		aRes = [oResObj, "DEATHS"];
		assert.strictEqual(JSON.stringify(fnIsolatedFunction(oControllerStub.aSortMonthData)), JSON.stringify(aRes), "Found a max month from limited segment. Confirmed and recovered bars are hiden.");
	});
});