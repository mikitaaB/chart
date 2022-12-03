sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/base/Log",
	"sap/m/MessageToast",
	"sap/ui/util/Storage",
    "./BaseController"
], function (JSONModel, Log, MessageToast, Storage, BaseController) {
	"use strict";

	return BaseController.extend("my.chart.web.controller.App", {
		onInit: function () {
			this.oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			this.oFilterStorage = new Storage(Storage.Type.session, "filterKeys");
			this.setModel(new JSONModel(), "periodTypeModel");
			this.setModel(new JSONModel(), "chartTypeModel");
			this.setModel(new JSONModel(), "countryModel");
			this.setModel(new JSONModel({
				"isFilter": false
			}), "userScopeModel");
			this.setModel(new JSONModel([{
				"dataTypeKey": "Confirmed",
				"dataTypeText": this.oBundle.getText("confirmed")
			}, {
				"dataTypeKey": "Recovered",
				"dataTypeText": this.oBundle.getText("recovered")
			}, {
				"dataTypeKey": "Deaths",
				"dataTypeText": this.oBundle.getText("deaths")
			}]), "dataTypeFilterModel");
			this.setModel(new JSONModel({
				"SELECTEDCHARTTYPE": "",
				"SELECTEDCOUNTRY": "",
				"SELECTEDPERIODTYPE": "",
				"SELECTEDDATATYPES": [],
				"ISFILTERSOPENED": null,
				"DATEFROM": null,
				"DATETO": null
			}), "filterTokensModel");

			this._getStorageData();

			var oFiltersData = this.getModel("filterTokensModel").getData();
			if (typeof oFiltersData.ISFILTERSOPENED !== "boolean") {
				oFiltersData.ISFILTERSOPENED = true;
			}
			// Set selected data types keys to MultiCombobox
			if (!oFiltersData.SELECTEDDATATYPES.length) {
				var aSelKeysDataType = [];
				var aDataTypeData = this.getModel("dataTypeFilterModel").getData();
				for (var sKey in aDataTypeData) {
					aSelKeysDataType.push(aDataTypeData[sKey].dataTypeKey);
				}
				oFiltersData.SELECTEDDATATYPES = aSelKeysDataType;
			}

			this.sLang = sap.ui.getCore().getConfiguration().getLanguage();
			if (this.sLang === "en") {
				this._setElementEnable(true, false);
			} else {
				this._setElementEnable(false, true);
			}

			var that = this;
			var oEventDelegate = {
				"onAfterRendering": function() {
					// Show on chart selected data types
					var aSelDataTypes = that.getModel("filterTokensModel").getData().SELECTEDDATATYPES;
					that.oChart.onShowHideDataTypes(aSelDataTypes);
					// Filter data by selected dates
					that.onApply();
				}
			};
			this.byId("idLineChart").addEventDelegate(oEventDelegate);
			this.byId("idBarChart").addEventDelegate(oEventDelegate);
		},

		onApply: function(oEvent) {
			var oFiltersData = this.getModel("filterTokensModel").getData();
			var dDateFrom = oFiltersData.DATEFROM;
			var dDateTo = oFiltersData.DATETO;
			if (!dDateFrom && dDateFrom > dDateTo) {
				if (oEvent) {
					MessageToast.show(this.oBundle.getText("warningDateMessage"));
				}
				return;
			}
			this.byId("idMainPage").setBusy(true);
			this.oChart.onShowIntervalByDate([dDateFrom, dDateTo]);
			this.byId("idMainPage").setBusy(false);
			this._setStorageData();
		},

		onReset: function() {
			var oFiltersModel = this.getModel("filterTokensModel");
			var oFiltersData = oFiltersModel.getData();
			if (!oFiltersData.DATEFROM && !oFiltersData.DATETO) {
				MessageToast.show(this.oBundle.getText("warningResetMessage"));
				return;
			}
			oFiltersData.DATEFROM = oFiltersData.DATETO = null;
			oFiltersModel.refresh();
			this._setStorageData();
			this.oChart.onReset();
		},

		onChartTypeChange: function() {
			this.byId("idLineChart").setVisible(false);
			this.byId("idBarChart").setVisible(false);
			var sType = this.getModel("filterTokensModel").getData().SELECTEDCHARTTYPE;
			this.oChart = this.byId("id" + sType + "Chart");
			this.oChart.setVisible(true);
			this.oChart.setConfirmedText(this.oBundle.getText("confirmed"));
			this.oChart.setRecoveredText(this.oBundle.getText("recovered"));
			this.oChart.setDeathsText(this.oBundle.getText("deaths"));
			this.oChart.setSickText(this.oBundle.getText("sick"));
			this.oChart.setTitle(this.oBundle.getText(sType.toLowerCase() + "ChartTitle"));
			this._setStorageData();
		},

		onCountryChange: function() {
			var sCountry = this.byId("idCountrySelect").getSelectedKey();
			this._setStorageData();
			this._getTimeseriesData(sCountry);
		},

		onPeriodTypeChange: function() {
			this._setStorageData();
		},

		onFilterDataType: function(oEvent) {
			var sChangedKey = oEvent.getParameter("changedItem").getKey();
			var aSelectedTypes = this.getModel("filterTokensModel").getData().SELECTEDDATATYPES;
			if (!aSelectedTypes.length) {
				aSelectedTypes.push(sChangedKey);
				MessageToast.show(this.oBundle.getText("warningHideAll"));
				return;
			}
			this.byId("idMainPage").setBusy(true);
			this.oChart.onShowHideDataTypes(sChangedKey);
			this.byId("idMainPage").setBusy(false);
			this._setStorageData();
		},

		onChangeLang: function() {
			this._setStorageData();
			this.sLang = this.sLang === "en" ? "ru" : "en";
			var sPath = window.location.href;
			window.location.href = sPath.substring(0, sPath.indexOf("html") + 4) + "?sap-language=" + this.sLang;
		},

		_getTimeseriesData: function(sCountry) {
			this.byId("idMainPage").setBusy(true);
			this.sentRequest("GET", "/api/timeseries/" + sCountry, {}).success(function(aData) {
				this.setModel(new JSONModel(aData), "timeseriesModel");
			}).fail(function(oError) {
				Log.error(oError);
			}).always(function() {
				this.byId("idMainPage").setBusy(false);
			});
		},

		_getCountries: function(sLang) {
			this.byId("idMainPage").setBusy(true);
			this.sentRequest("GET", "/api/country/" + sLang, {}).success(function(aData) {
				this.setModel(new JSONModel(aData), "countryModel");
				this._updateFilterModel("SELECTEDCOUNTRY", aData[0].COUNTRYCODE);
				this.onCountryChange();
			}).fail(function(oError) {
				Log.error(oError);
			}).always(function() {
				this.byId("idMainPage").setBusy(false);
			});
		},

		_getChartTypes: function(sLang) {
			this.byId("idMainPage").setBusy(true);
			this.sentRequest("GET", "/api/chartType/" + sLang, {}).success(function(aData) {
				this.getModel("chartTypeModel").setData(aData);
				this._updateFilterModel("SELECTEDCHARTTYPE", aData[0].CHARTCODE);
				this.onChartTypeChange();
			}).fail(function(oError) {
				Log.error(oError);
			}).always(function() {
				this.byId("idMainPage").setBusy(false);
			});
		},

		_getPeriodTypes: function(sLang) {
			this.byId("idMainPage").setBusy(true);
			this.sentRequest("GET", "/api/periodType/" + sLang, {}).success(function(aData) {
				this.getModel("periodTypeModel").setData(aData);
				this._updateFilterModel("SELECTEDPERIODTYPE", aData[0].PERIODCODE);
				this.onPeriodTypeChange();
			}).fail(function(oError) {
				Log.error(oError);
			}).always(function() {
				this.byId("idMainPage").setBusy(false);
			});
		},

		_getUserScope: function() {
			this.byId("idMainPage").setBusy(true);
			this.sentRequest("GET", "/api/user/", {}).success(function(aData) {
				var oUserScopeModel = this.getModel("userScopeModel");
				oUserScopeModel.getData().isFilter = aData.indexOf("Filter") > 0 ? true : false;
				oUserScopeModel.refresh();
			}).fail(function(oError) {
				Log.error(oError);
			}).always(function() {
				this.byId("idMainPage").setBusy(false);
			});
		},

		_getStorageData: function() {
			var sJSON = this.oFilterStorage.get("local_storage");
			if (sJSON) {
				var oData = JSON.parse(sJSON);
				oData.DATEFROM = oData.DATEFROM ? new Date(oData.DATEFROM) : null;
				oData.DATETO = oData.DATETO ? new Date(oData.DATETO) : null;
				this.getModel("filterTokensModel").setData(oData, true);
			}
		},

		_setStorageData: function() {
			var oData = this.getModel("filterTokensModel").getData();
			var sJSON = JSON.stringify(oData);
			this.oFilterStorage.put("local_storage", sJSON);
		},

		_setElementEnable: function(bRu, bEn) {
			this._getCountries(this.sLang);
			this._getChartTypes(this.sLang);
			this._getPeriodTypes(this.sLang);
			this._getUserScope();
			this.byId("idChangeLangRuButton").setEnabled(bRu);
			this.byId("idChangeLangEnButton").setEnabled(bEn);
		},

		_updateFilterModel: function(sFilterType, sValue) {
			if (!this.getModel("filterTokensModel").getData()[sFilterType])  {
				this.getModel("filterTokensModel").getData()[sFilterType] = sValue;
				this.getModel("filterTokensModel").refresh();
			}
		}
	});
});