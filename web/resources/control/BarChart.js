sap.ui.define([
	"sap/ui/core/Control",
	"sap/ui/core/format/DateFormat",
	"sap/ui/core/Locale",
	"sap/ui/core/ResizeHandler",
	"sap/ui/model/json/JSONModel"
], function (Control, DateFormat, Locale, ResizeHandler, JSONModel) {
	"use strict";
	return Control.extend("my.chart.web.control.BarChart", {
		metadata: {
			properties: {
				data: {
					type: "Element"
				},
				title: {
					type: "string"
				},
				confirmedText: {
					type: "string"
				},
				recoveredText: {
					type: "string"
				},
				deathsText: {
					type: "string"
				},
				sickText: {
					type: "string"
				},
				periodicity: {
					type: "string"
				}
			}
		},

		exit: function() {
			ResizeHandler.deregister(this.sResizeHandlerId);
		},

		onBeforeRendering: function() {
			ResizeHandler.deregister(this.sResizeHandlerId);
		},

		onAfterRendering: function() {
			this.sResizeHandlerId = ResizeHandler.register(this.getParent().getParent(), this._drawChart.bind(this));

			var aTimeseriesData = this.getData();
			if (!aTimeseriesData) {
				return;
			}
			aTimeseriesData.forEach(function(oDayData) {
				oDayData.DATE = new Date(oDayData.DATE);
			});
			this.aFilteredBarData = aTimeseriesData.sort(function(oPrevDay, oNextDay) {
				return oPrevDay.DATE > oNextDay.DATE ? 1 : -1;
			});

			this.setModel(new JSONModel({
				bIsVisConfirmedBar: true,
				bIsVisRecoveredBar: true,
				bIsVisDeathsBar: true
			}), "barVisibleModel");

			this.oCommonConfigObj = {
				aBarTypes: ["Confirmed", "Recovered", "Deaths"],
				sMonthly: "Monthly",
				iSubHeight: 65,
				iCurrentWidth: 0,
				iMarginBar: 50,
				oBoundPrevRect: {},
				oBoundNewRect: {},
				bSelectedBar: false,
				oSelectedBarData: {},
				iSubChartHeight: 125,
				oTransformZoomBar: d3.zoomIdentity
			};
			this.oCommonConfigObj.fHeightBar = this.$().parents().eq(3).height() - this.oCommonConfigObj.iMarginBar / 1.5 - this.oCommonConfigObj.iSubChartHeight;
			this.oCommonConfigObj.fHeightBarChart = this.oCommonConfigObj.fHeightBar - 2.3 * this.oCommonConfigObj.iMarginBar;
			var oZoomScaleFactor = {
				iMinScale: 1,
				iMaxScale: 19
			};

			var oLocale = new Locale(sap.ui.getCore().getConfiguration().getLanguage());
			this.oDateFormat = DateFormat.getDateInstance({
				format: "yMMMd"
			}, oLocale);

			this.oDivTooltip = d3.select("body")
			  .append("div")
				.attr("class", "tooltip")
				.style("opacity", 0);

			var that = this;
			this.fnBrush = d3.brushX()
				.on("brush end", function() {
					that._brushed.call(that);
				});
			this.fnZoomBar = d3.zoom()
				.scaleExtent([oZoomScaleFactor.iMinScale, oZoomScaleFactor.iMaxScale])
				.on("zoom", function() {
					that._zoomedBar.call(that);
				});

			this.oBarChart = d3.select(this.getDomRef()).append("svg")
				.attr("class", "svgStyle")
				.on("mouseout", function() {
					that._mouseoutBarEvent.call(that);
				});
			this.oMiniBarChart = d3.select(this.getDomRef()).append("svg")
				.attr("height", this.oCommonConfigObj.iSubChartHeight)
				.attr("class", "svgStyle");

			this.oClipPathBars = {
				oClipBar: this._appendClipPath(this.oBarChart, "clipBar", this.oCommonConfigObj.fHeightBarChart),
				oClipSubBar: this._appendClipPath(this.oMiniBarChart, "clipSubBar", this.oCommonConfigObj.iSubHeight)
			};
			this.oMainBarChart = this.oBarChart.append("g")
				.attr("id", "mainBarChart")
				.attr("class", "mainBarChart axis")
				.call(this.fnZoomBar);
			this.oBarChartRect = this.oMainBarChart.append("rect")
				.attr("class", "zoom")
				.attr("height", this.oCommonConfigObj.fHeightBarChart);
			this.oSubBarChart = this.oMiniBarChart.append("g")
				.attr("id", "subBarChart")
				.attr("class", "subChart axis");

			this.oScalesBar = {
				// A time scale with the specified domain for X.
				fnScaleXBar: d3.scaleTime()
					.domain(d3.extent(this.aFilteredBarData, function(oDayData) {
						return oDayData.DATE;
					})),
				// A continuous scale with the specified domain and range for Y.
				fnScaleYBar: d3.scaleLinear()
					.domain([0, d3.max(this.aFilteredBarData, function(oDayData) {
						return oDayData.CONFIRMED;
					})]).nice()
					.range([this.oCommonConfigObj.fHeightBarChart, 0]),
				// A time scale with the specified domain for X on small chart.
				fnSubScaleX: d3.scaleTime()
					.domain(d3.extent(this.aFilteredBarData, function(oDayData) {
						return oDayData.DATE;
					})),
				// A continuous scale with the specified domain and range for Y on small chart.
				fnSubScaleY: d3.scaleLinear()
					.domain([0, d3.max(this.aFilteredBarData, function(oDayData) {
						return oDayData.CONFIRMED;
					})]).nice()
					.range([this.oCommonConfigObj.iSubHeight, 0])
			};

			this.oAxisBar = {
				fnAxisBarX: d3.axisBottom(this.oScalesBar.fnScaleXBar)
					.tickFormat(d3.timeFormat("%d.%m")),
				fnAxisBarY: d3.axisLeft(this.oScalesBar.fnScaleYBar)
			};

			this.oGBars = {
				oGBarX: this.oMainBarChart.append("g")
					.attr("class", "x-axis")
					.attr("transform", "translate(0," + this.oCommonConfigObj.fHeightBarChart + ")")
					.call(this.oAxisBar.fnAxisBarX),
				oGBarY: this.oMainBarChart.append("g")
					.attr("class", "y-axis")
					.call(this.oAxisBar.fnAxisBarY),
				oGSubBarX: this.oSubBarChart.append("g")
					.attr("class", "x subaxis")
					.attr("transform", "translate(0," + this.oCommonConfigObj.iSubHeight + ")")
			};

			this.oBars = {
				oBar: this._appendGBars(this.oMainBarChart),
				oSubBar: this._appendGBars(this.oSubBarChart)
			};

			this.oBarChart.append("text")
				.attr("class", "barChartTitle")
				.attr("y", 20)
				.style("text-anchor", "middle")
				.text(this.getTitle());

			this.sTypePeriod = this.getPeriodicity();
			if (this.sTypePeriod === this.oCommonConfigObj.sMonthly) {
				this._createMonthlyData();
			}

			this._drawChart();
		},

		onReset: function() {
			var aBarData = this.sTypePeriod === this.oCommonConfigObj.sMonthly ? this.aMonthData : this.aFilteredBarData;
			var aScaleXDomain = d3.extent(aBarData, function(oDayData) {
				return oDayData.DATE;
			});
			this.onShowIntervalByDate(aScaleXDomain);
		},

		onShowHideDataTypes: function(vSelectedKey) {
			var that = this;
			if (!this.oBarChart) {
				return;
			}
			var oBarVisibleData = this.getModel("barVisibleModel").getData();
			var fnScaleX = this.oCommonConfigObj.oTransformZoomBar.rescaleX(this.oScalesBar.fnScaleXBar);
			var iMaxValueY = 0;
			var aBars = [];
			if (vSelectedKey instanceof Array) {
				aBars = vSelectedKey;
				var iBarsLength = aBars.length;
				for (var i = 0; i < iBarsLength; i++) {
					oBarVisibleData["bIsVis" + aBars[i] + "Bar"] = !oBarVisibleData["bIsVis" + aBars[i] + "Bar"];
				}
				iMaxValueY = this._getMaxY(fnScaleX);
				this.oScalesBar.fnSubScaleY.domain([0, iMaxValueY]).nice();
			} else {
				aBars = this.oCommonConfigObj.aBarTypes.slice();
				aBars.splice(aBars.indexOf(vSelectedKey), 1);
				aBars.unshift(vSelectedKey);
			}
			var iBarTypesLength = aBars.length;
			for (var i = 0; i < iBarTypesLength; i++) {
				var sKey = aBars[i];
				if (sKey === vSelectedKey) {
					oBarVisibleData["bIsVis" + sKey + "Bar"] = !oBarVisibleData["bIsVis" + sKey + "Bar"];
					if (!iMaxValueY) {
						iMaxValueY = this._getMaxY(fnScaleX);
					}
					this.oScalesBar.fnScaleYBar.domain([0, iMaxValueY]).nice();
					this.oGBars.oGBarY.call(that.oAxisBar.fnAxisBarY.scale(that.oScalesBar.fnScaleYBar));
					var iMaxAllObjY = this.oCommonConfigObj.oTransformZoomBar.k > 1 ? this._getMaxAllDataY() : iMaxValueY;
					this.oScalesBar.fnSubScaleY.domain([0, iMaxAllObjY]).nice();

					this.oBars.oBar.selectAll(".bar" + sKey)
						.attr("height", function(oDayData) {
							oDayData = that._getMaxKey(oDayData) !== that.oCommonConfigObj.aBarTypes[0].toUpperCase() ? that._getSortedMonth(oDayData) : oDayData;
							return oBarVisibleData["bIsVis" + sKey + "Bar"] ? that.oCommonConfigObj.fHeightBarChart - that.oScalesBar.fnScaleYBar(that._getHeightOfBar(oDayData, sKey.toUpperCase())) : 0;
						});
				}
				this.oBars.oBar.selectAll(".bar" + sKey)
					.transition()
					.duration(2500)
					.delay(function (oData, iIndex) {
						return iIndex * 8;
					})
					.attr("y", function(oDayData) {
						oDayData = that._getMaxKey(oDayData) !== that.oCommonConfigObj.aBarTypes[0].toUpperCase() ? that._getSortedMonth(oDayData) : oDayData;
						return that.oScalesBar.fnScaleYBar(oDayData[sKey.toUpperCase()]);
					})
					.attr("height", function(oDayData) {
						oDayData = that._getMaxKey(oDayData) !== that.oCommonConfigObj.aBarTypes[0].toUpperCase() ? that._getSortedMonth(oDayData) : oDayData;
						return oBarVisibleData["bIsVis" + sKey + "Bar"] ? 0 : that.oCommonConfigObj.fHeightBarChart - that.oScalesBar.fnScaleYBar(that._getHeightOfBar(oDayData, sKey.toUpperCase()));
					});
				this.oBars.oSubBar.selectAll(".subBar" + sKey)
					.attr("y", function(oDayData) {
						oDayData = that._getMaxKey(oDayData) !== that.oCommonConfigObj.aBarTypes[0].toUpperCase() ? that._getSortedMonth(oDayData) : oDayData;
						return that.oScalesBar.fnSubScaleY(oDayData[sKey.toUpperCase()]);
					})
					.attr("height", function(oDayData) {
						oDayData = that._getMaxKey(oDayData) !== that.oCommonConfigObj.aBarTypes[0].toUpperCase() ? that._getSortedMonth(oDayData) : oDayData;
						return oBarVisibleData["bIsVis" + sKey + "Bar"] ? 0 : that.oCommonConfigObj.iSubHeight - that.oScalesBar.fnSubScaleY(that._getHeightOfBar(oDayData, sKey.toUpperCase()));
					});
			}
			this._drawLegend();
			this._redrawGridLines(this.iWidthBarChart);
		},

		onShowIntervalByDate: function(aDates) {
			if (!aDates[1] && !aDates[0]) {
				return;
			}
			if (!aDates[1] || aDates[1] > this.aFilteredBarData[this.aFilteredBarData.length - 1].DATE) {
				aDates[1] = this.aFilteredBarData[this.aFilteredBarData.length - 1].DATE;
			}
			if (!aDates[0] || aDates[0] < this.aFilteredBarData[0].DATE) {
				aDates[0] = this.aFilteredBarData[0].DATE;
			}
			var aBarData = this.sTypePeriod === this.oCommonConfigObj.sMonthly ? this.aMonthData : this.aFilteredBarData;
			var aNewBarData = aBarData.filter(function(oDayData) {
				return oDayData.DATE >= aDates[0] && oDayData.DATE <= aDates[1];
			});
			this.oScalesBar.fnScaleXBar.domain(d3.extent(aNewBarData, function(oDayData) {
				return oDayData.DATE;
			}));
			this.oGBars.oGBarX.call(this.oAxisBar.fnAxisBarX.scale(this.oScalesBar.fnScaleXBar));
			var maxObjY = this._getMaxY.call(this, this.oScalesBar.fnScaleXBar);
			this.oScalesBar.fnScaleYBar.domain([0, maxObjY]).nice();
			this.oGBars.oGBarY.call(this.oAxisBar.fnAxisBarY.scale(this.oScalesBar.fnScaleYBar));

			var aScaleXBarDomain = this.oScalesBar.fnScaleXBar.domain();
			var aRect = [this.oScalesBar.fnSubScaleX(aScaleXBarDomain[0]), this.oScalesBar.fnSubScaleX(aScaleXBarDomain[1])];
			this.oSubBarChart.select(".brush").call(this.fnBrush.move, aRect);
			this._drawOnlyMainBar(aNewBarData, this.oScalesBar.fnScaleXBar, this.oScalesBar.fnScaleYBar);
		},

		// Adapts the chart for a small window size. Show 10 recent cases
		_adaptChart: function() {
			this.oCommonConfigObj.oTransformZoomBar = {};
			if (this.oCommonConfigObj.iCurrentWidth <= window.screen.width * 0.6) {
				var iDatePoint = this.oScalesBar.fnScaleXBar(this.aFilteredBarData[this.aFilteredBarData.length - 11].DATE);
				var iLastDatePoint = this.oScalesBar.fnScaleXBar(this.aFilteredBarData[this.aFilteredBarData.length - 1].DATE);
				var fK = this.iWidthBarChart / (iLastDatePoint - iDatePoint);
				this.oCommonConfigObj.oTransformZoomBar = d3.zoomIdentity.translate((-fK * iDatePoint), 0).scale(fK);
			} else {
				this.oCommonConfigObj.oTransformZoomBar = d3.zoomIdentity;
			}
			this.oBarChartRect.transition()
				.duration(300)
				.call(this.fnZoomBar.transform, this.oCommonConfigObj.oTransformZoomBar);
		},

		_appendClipPath: function(oChart, sId, iHeight) {
			return oChart.append("defs").append("clipPath")
				.attr("id", sId)
			  .append("rect")
				.attr("height", iHeight);
		},

		_appendGBars: function(oChart) {
			return oChart
			  .append("g")
				.attr("class", "bars")
				.selectAll("g")
				.data(this.aFilteredBarData)
				.enter();
		},

		_brushed: function() {
			if (this.oCommonConfigObj.bSelectedBar) {
				this.oCommonConfigObj.bSelectedBar = false;
				this.oBarChartRect.on("mousemove", null);
			}
			if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") {
				return;
			}
			var aSel = d3.event.selection || this.oScalesBar.fnSubScaleX.range();
			this.oScalesBar.fnScaleXBar.domain(aSel.map(this.oScalesBar.fnSubScaleX.invert, this.oScalesBar.fnSubScaleX));
			var aBarData = this.sTypePeriod === this.oCommonConfigObj.sMonthly ? this.aMonthData : this.aFilteredBarData;
			var aNewBarData = this._getFilteredBarData(aBarData);
			var iMaxObjY = this._getMaxY(this.oScalesBar.fnScaleXBar);
			this.oScalesBar.fnScaleYBar.domain([0, iMaxObjY]).nice();
			this.oGBars.oGBarY.call(this.oAxisBar.fnAxisBarY.scale(this.oScalesBar.fnScaleYBar));

			var iBrushValue = aSel[1] - aSel[0];
			var oZoomTransform = d3.zoomIdentity
				.scale(this.iWidthBarChart / iBrushValue)
				.translate(-aSel[0], 0);
			this.oBarChart.call(this.fnZoomBar.transform, oZoomTransform);

			this._redrawGridLines(this.iWidthBarChart);
			this._drawOnlyMainBar(aNewBarData, this.oScalesBar.fnScaleXBar, this.oScalesBar.fnScaleYBar);
		},

		_createMonthlyData: function() {
			this.aMonthData = [];
			var aDataByMonth = d3.nest().key(function(oDayData) {
				return new Date(oDayData.DATE).getMonth();
			}).entries(this.aFilteredBarData);
			this.aMonthData = aDataByMonth.map(function(oMonth) {
				var iConfSub = oMonth.values[oMonth.values.length - 1].CONFIRMED - oMonth.values[0].CONFIRMED;
				var iRecovSub = oMonth.values[oMonth.values.length - 1].RECOVERED - oMonth.values[0].RECOVERED;
				var iDeathsSub = oMonth.values[oMonth.values.length - 1].DEATHS - oMonth.values[0].DEATHS;
				return {
					"ID": oMonth.values[0].ID,
					"DATE": oMonth.values[0].DATE,
					"CONFIRMED": iConfSub ? iConfSub : oMonth.values[oMonth.values.length - 1].CONFIRMED,
					"RECOVERED": iRecovSub ? iRecovSub : oMonth.values[oMonth.values.length - 1].RECOVERED,
					"DEATHS": iDeathsSub ? iDeathsSub : oMonth.values[oMonth.values.length - 1].DEATHS
				};
			});
			this.aSortMonthData = this.aMonthData.map(function(oMonth) {
				var aMonth = [oMonth.CONFIRMED, oMonth.RECOVERED, oMonth.DEATHS];
				aMonth.sort(function(oPrevKey, oNextKey) {
					return oPrevKey < oNextKey ? 1 : -1;
				});
				return {
					"ID": oMonth.ID,
					"DATE": oMonth.DATE,
					"CONFIRMED": aMonth[0],
					"RECOVERED": aMonth[1],
					"DEATHS": aMonth[2]
				};
			});
		},

		_drawChart: function() {
			this.oCommonConfigObj.iCurrentWidth = innerWidth - 2.5 * this.oCommonConfigObj.iMarginBar;
			this.iMarginLeftBar = this.oCommonConfigObj.iCurrentWidth <= window.screen.width * 0.75 ? 0 : 110;

			this._drawLegend();
			var fTranslateX = 1.5 * this.oCommonConfigObj.iMarginBar + this.iMarginLeftBar;
			this.oMainBarChart
				.attr("transform", "translate(" + fTranslateX + "," + (this.oCommonConfigObj.iMarginBar + 15) + ")");
			this.oSubBarChart
				.attr("transform", "translate(" + fTranslateX + "," + (this.oCommonConfigObj.iMarginBar / 2) + ")");

			this.iWidthBarChart = this.oCommonConfigObj.iCurrentWidth - 2 * this.oCommonConfigObj.iMarginBar - this.iMarginLeftBar;
			this.oBarChart
				.attr("height", this.oCommonConfigObj.fHeightBar)
				.attr("width", this.oCommonConfigObj.iCurrentWidth);
			this.oMiniBarChart.attr("width", this.oCommonConfigObj.iCurrentWidth);

			this.oScalesBar.fnScaleXBar.range([this.oCommonConfigObj.iCurrentWidth / this.aFilteredBarData.length / 2, this.iWidthBarChart]);
			this.oScalesBar.fnSubScaleX.range([this.oCommonConfigObj.iCurrentWidth / this.aFilteredBarData.length / 2, this.iWidthBarChart]);
			this.oBarChartRect.attr("width", this.iWidthBarChart);
			this.oSubBarChart.attr("width", this.iWidthBarChart);
			this.oClipPathBars.oClipBar.attr("width", this.iWidthBarChart);
			this.oClipPathBars.oClipSubBar.attr("width", this.iWidthBarChart);
			this.fnBrush.extent([[0, 0], [this.iWidthBarChart, this.oCommonConfigObj.iSubHeight]]);

			this._drawTickScale(this.sTypePeriod === this.oCommonConfigObj.sMonthly ? this.aMonthData : this.aFilteredBarData);

			this.fnZoomBar.translateExtent([[0, 0], [this.iWidthBarChart, this.oCommonConfigObj.fHeightBarChart]])
				.extent([[0, 0], [this.iWidthBarChart, this.oCommonConfigObj.fHeightBarChart]]);

			var oBrushNode = this.oSubBarChart.select("g.brush").node();
			if (oBrushNode) {
				var aBrushSel = d3.brushSelection(oBrushNode);
				if (aBrushSel) {
					this.oSubBarChart.select(".brush").call(this.fnBrush.move, null);
					this.oSubBarChart.select(".brush")
						.call(this.fnBrush.move, [0, this.iWidthBarChart]);
				}
			} else {
				this.oSubBarChart.append("g")
					.attr("class", "brush")
					.call(this.fnBrush)
					.call(this.fnBrush.move, [0, this.iWidthBarChart]);
			}
			this._redrawGridLines(this.iWidthBarChart);
			this._drawOnlySubBar(this.sTypePeriod === this.oCommonConfigObj.sMonthly ? this.aMonthData : this.aFilteredBarData);
			this._adaptChart();

			this.oBarChart.select(".barChartTitle")
				.attr("x", this.oCommonConfigObj.iCurrentWidth / 2 + this.oCommonConfigObj.iMarginBar + this.iMarginLeftBar);
		},

		_drawLegend: function() {
			this.aLegendData = [];
			var aLegendColors = [];
			var oBarVisibleData = this.getModel("barVisibleModel").getData();
			var iVisibleDataLength = Object.keys(oBarVisibleData).length;
			var aColors = ["#FFA500", "#008000", "#FF0000"];
			for (var i = 0; i < iVisibleDataLength; i++) {
				if (!oBarVisibleData["bIsVis" + this.oCommonConfigObj.aBarTypes[i] + "Bar"]) {
					this.aLegendData.push(this["get" + this.oCommonConfigObj.aBarTypes[i] + "Text"]());
					aLegendColors.push(aColors[i]);
				}
			}
			if (!aLegendColors.length) {
				return;
			}
			this.aScaleLegendColors = d3.scaleOrdinal(aLegendColors);
			this.oBarChart.selectAll(".legendBarLeft").remove();
			this.oBarChart.selectAll(".legendBarTop").remove();
			if (this.iMarginLeftBar) {
				this._drawLeftLegend();
			} else {
				this._drawTopLegend();
			}
		},

		_drawLeftLegend: function() {
			var that = this;
			var oLegendGroup = this.oBarChart
			  .append("g")
				.attr("class", "legendGroup");
			var oLegendBarLeft = oLegendGroup.selectAll(".legendBarLeft")
				.data(this.aLegendData)
				.enter()
			  .append("g")
				.attr("class", "legendBarLeft")
				.attr("transform", function(oDayData, iIndex) {
					return "translate(0," + iIndex * 30 + ")";
				});
			oLegendBarLeft.append("circle")
				.attr("cx", 20)
				.attr("cy", this.oCommonConfigObj.fHeightBar / 3)
				.attr("r", 6.5)
				.attr("fill", function(oDayData, iIndex) {
					return that.aScaleLegendColors(iIndex);
				});
			oLegendBarLeft.append("text")
				.attr("x", 35)
				.attr("y", this.oCommonConfigObj.fHeightBar / 3)
				.attr("dy", ".40em")
				.style("font-size", "15px")
				.text(function(sLegendText) {
					return sLegendText;
				});
		},

		_drawTopLegend: function() {
			var that = this;
			var oLegendGroup = this.oBarChart
			  .append("g")
				.attr("class", "legendGroup");
			var oLegendBarTop = oLegendGroup.selectAll(".legendBarTop")
				.data(this.aLegendData)
				.enter()
			  .append("g")
				.attr("class", "legendBarTop")
				.attr("transform", function(oDayData, iIndex) {
					return "translate(" + (iIndex * 120) + ",0)";
				});
			oLegendBarTop.append("circle")
				.attr("cx", 40)
				.attr("cy", 40)
				.attr("r", 6.5)
				.attr("fill", function(oDayData, iIndex) {
					return that.aScaleLegendColors(iIndex);
				});
			oLegendBarTop.append("text")
				.attr("x", 55)
				.attr("y", 40)
				.attr("dy", ".40em")
				.style("font-size", "15px")
				.text(function(sLegendText) {
					return sLegendText;
				});
		},

		_drawOnlyMainBar: function(aBarData, fnScaleX, fnScaleY) {
			var oBarVisibleData = this.getModel("barVisibleModel").getData();
			if (oBarVisibleData.bIsVisConfirmedBar && oBarVisibleData.bIsVisRecoveredBar && oBarVisibleData.bIsVisDeathsBar) {
				return;
			}
			var iWidthBar = (this.iWidthBarChart - 2.5 * this.oCommonConfigObj.iMarginBar) / aBarData.length;
			this.oBars.oBar.selectAll("rect").remove();
			this.oDivTooltip.transition()
				.duration(500)
				.style("opacity", 0);
			this.oBars.oBar = this.oMainBarChart.append("g")
				.attr("class", "bars")
				.selectAll("g")
				.data(aBarData)
				.enter();
			var that = this;
			var iBarTypesLength = this.oCommonConfigObj.aBarTypes.length;
			for (var i = 0; i < iBarTypesLength; i++) {
				var sKey = this.oCommonConfigObj.aBarTypes[i];
				this.oBars.oBar.append("rect")
					.attr("class", function(oDayData) {
						return "bar" + sKey + " bar-" + oDayData.ID;
					})
					.attr("x", function(oDayData) {
						return fnScaleX(oDayData.DATE) - iWidthBar/2;
					})
					.on("mouseover", function(oDayData) {
						that._mouseoverBarEvent.call(that, this, oDayData);
					})
					.attr("width", iWidthBar)
					.attr("y", function(oDayData) {
						oDayData = that._getMaxKey(oDayData) !== that.oCommonConfigObj.aBarTypes[0].toUpperCase() ? that._getSortedMonth(oDayData) : oDayData;
						return fnScaleY(oDayData[sKey.toUpperCase()]);
					})
					.attr("height", function(oDayData) {
						oDayData = that._getMaxKey(oDayData) !== that.oCommonConfigObj.aBarTypes[0].toUpperCase() ? that._getSortedMonth(oDayData) : oDayData;
						return oBarVisibleData["bIsVis" + sKey + "Bar"] ? 0 : that.oCommonConfigObj.fHeightBarChart - fnScaleY(that._getHeightOfBar(oDayData, sKey.toUpperCase()));
					});
			}
		},

		_drawOnlySubBar: function(aBarData) {
			var oBarVisibleData = this.getModel("barVisibleModel").getData();
			var iWidthBar = (this.iWidthBarChart - 2.5 * this.oCommonConfigObj.iMarginBar) / aBarData.length;
			this.oBars.oSubBar.selectAll("rect").remove();
			this.oBars.oSubBar = this.oSubBarChart.append("g")
				.attr("class", "bars")
				.selectAll("g")
				.data(aBarData)
				.enter();
			var that = this;
			var iBarTypesLength = this.oCommonConfigObj.aBarTypes.length;
			for (var i = 0; i < iBarTypesLength; i++) {
				var sKey = this.oCommonConfigObj.aBarTypes[i];
				var sBarClass = "subBar" + sKey;
				this.oBars.oSubBar.append("rect")
					.attr("class", function(oDayData) {
						return sBarClass + " bar-" + oDayData.ID;
					})
					.attr("x", function(oDayData) {
						return that.oScalesBar.fnSubScaleX(oDayData.DATE) - iWidthBar / 2;
					})
					.attr("y", function(oDayData) {
						return that.oScalesBar.fnSubScaleY(oDayData[sKey.toUpperCase()]);
					})
					.attr("height", function(oDayData) {
						return oBarVisibleData["bIsVis" + sKey + "Bar"] ? 0 : that.oCommonConfigObj.iSubHeight - that.oScalesBar.fnSubScaleY(that._getHeightOfBar(oDayData, sKey.toUpperCase()));
					})
					.attr("width", iWidthBar);
			}
		},

		_drawTickScale: function(aBarData, fnNewXScaleBar) {
			var oGBarX = {};
			if (fnNewXScaleBar) {
				oGBarX = this.oGBars.oGBarX;
			} else {
				fnNewXScaleBar = this.oScalesBar.fnSubScaleX;
				oGBarX = this.oGBars.oGSubBarX;
			}
			var sTimeFormat = this.sTypePeriod === this.oCommonConfigObj.sMonthly ? "%b" : "%d.%m";
			var fnTickScale = d3.scalePow([aBarData.length, 0], [aBarData.length / 50, 0]).exponent(.01);
			var iBrushValue = this.fnBrush.extent().call()[1][0] - this.fnBrush.extent().call()[0][0];
			var iTickValueMultiplier = Math.ceil(Math.abs(fnTickScale(iBrushValue)));
			var aFilteredTickValues = aBarData.reduce(function(aAccum, oCurData, iIndex) {
				return iIndex % iTickValueMultiplier === 0 ? aAccum.concat(oCurData.DATE) : aAccum;
			}, []);
			oGBarX.call(this.oAxisBar.fnAxisBarX.scale(fnNewXScaleBar).tickFormat(d3.timeFormat(sTimeFormat)).tickValues(aFilteredTickValues));
			var fTickDistance = fnNewXScaleBar(aFilteredTickValues[aFilteredTickValues.length - 1]) -
				fnNewXScaleBar(aFilteredTickValues[aFilteredTickValues.length - 2]);
			if (fTickDistance <= 30) {
				oGBarX.selectAll("text")
					.attr("dx", "-.8em")
					.attr("dy", ".15em")
					.attr("transform", "rotate(-65)")
					.style("text-anchor", "end");
			} else {
				oGBarX.selectAll("text")
					.attr("dx", "0em")
					.attr("dy", ".5em")
					.attr("transform", "rotate(0)")
					.style("text-anchor", "middle");
			}
		},

		_getBarsByData: function(oDayData) {
			var aBars = [];
			var iBarTypesLength = this.oCommonConfigObj.aBarTypes.length;
			for (var i = 0; i < iBarTypesLength; i++) {
				aBars.push(this.oMainBarChart.select(".bar" + this.oCommonConfigObj.aBarTypes[i] + "." + "bar-" + oDayData.ID).data(oDayData).exit());
			}
			return aBars;
		},

		_getFilteredBarData: function(aBarData) {
			var aScaleDomainX = this.oScalesBar.fnScaleXBar.domain();
			return aBarData.filter(function(oDayData) {
				return oDayData.DATE >= aScaleDomainX[0] && oDayData.DATE <= aScaleDomainX[1];
			});
		},

		_getHeightOfBar: function(oDayData, sCurBar) {
			var aKeys = this._getNotHiddenTypes();
			// Key with min value from all types
			var sMinAllKey = aKeys.reduce(function(sPrevKey, sCurKey) {
				return oDayData[sPrevKey] < oDayData[sCurKey] ? sPrevKey : sCurKey;
			});
			if (aKeys.length < 2) {
				return oDayData[sCurBar];
			}
			// Remove key of current bar from array
			var iCurBarIndex = aKeys.indexOf(sCurBar);
			if (iCurBarIndex > -1) {
				aKeys.splice(iCurBarIndex, 1);
			}
			var sMaxKey = aKeys.reduce(function(sPrevKey, sCurKey) {
				return oDayData[sPrevKey] > oDayData[sCurKey] ? sPrevKey : sCurKey;
			});
			var sMinKey = aKeys.reduce(function(sPrevKey, sCurKey) {
				return oDayData[sPrevKey] < oDayData[sCurKey] ? sPrevKey : sCurKey;
			});
			if (sCurBar === sMinAllKey) {
				return oDayData[sCurBar];
			}
			var iValue = oDayData[sMaxKey] > oDayData[sCurBar] ? oDayData[sMinKey] : oDayData[sMaxKey];
			return oDayData[sCurBar] - iValue > iValue - oDayData[sCurBar] ? oDayData[sCurBar] - iValue : iValue - oDayData[sCurBar];
		},

		_getNotHiddenTypes: function() {
			var oBarVisibleData = this.getModel("barVisibleModel").getData();
			var aKeys = this.oCommonConfigObj.aBarTypes.slice();
			var aBarTypesLength = this.oCommonConfigObj.aBarTypes.length;
			for (var i = 0; i < aBarTypesLength; i++) {
				if (oBarVisibleData["bIsVis" + this.oCommonConfigObj.aBarTypes[i] + "Bar"]) {
					var iIndex = aKeys.indexOf(this.oCommonConfigObj.aBarTypes[i]);
					if (iIndex > -1) {
						aKeys.splice(iIndex, 1);
					}
				}
			}
			var iKeysLength = aKeys.length;
			for (var i = 0; i < iKeysLength; i++) {
				aKeys[i] = aKeys[i].toUpperCase();
			}
			return aKeys;
		},

		_getMaxY: function(fnScaleX) {
			var oBarVisibleData = this.getModel("barVisibleModel").getData();
			if (oBarVisibleData.bIsVisConfirmedBar && oBarVisibleData.bIsVisRecoveredBar && oBarVisibleData.bIsVisDeathsBar) {
				return;
			}
			var aScaleDomainX = fnScaleX.domain();
			var aBarData = this.sTypePeriod === this.oCommonConfigObj.sMonthly ? this.aSortMonthData : this.aFilteredBarData;
			var aNewBarData = aBarData.filter(function(oDay) {
				return oDay.DATE >= aScaleDomainX[0] && oDay.DATE <= aScaleDomainX[1];
			});
			var oMaxObj = {};
			var sBar = this.oCommonConfigObj.aBarTypes[0].toUpperCase();
			if (this.sTypePeriod === this.oCommonConfigObj.sMonthly) {
				var aMaxMonthObj = this._getMaxMonthObj(aNewBarData);
				oMaxObj = aMaxMonthObj[0];
				sBar = aMaxMonthObj[1];
			} else {
				if (!oBarVisibleData.bIsVisConfirmedBar) {
					sBar = this.oCommonConfigObj.aBarTypes[0].toUpperCase();
				} else {
					if (!oBarVisibleData.bIsVisRecoveredBar) {
						sBar = this.oCommonConfigObj.aBarTypes[1].toUpperCase();
					} else if (!oBarVisibleData.bIsVisDeathsBar) {
						sBar = this.oCommonConfigObj.aBarTypes[2].toUpperCase();
					}
				}
				oMaxObj = aNewBarData.reduce(function(oPrev, oCurrent) {
					return (oPrev[sBar] > oCurrent[sBar]) ? oPrev : oCurrent;
				});
			}
			return oMaxObj[sBar];
		},

		_getMaxAllDataY: function() {
			if (this.sTypePeriod === this.oCommonConfigObj.sMonthly) {
				var aMaxMonthObj = this._getMaxMonthObj(this.aSortMonthData);
				var oMaxObj = aMaxMonthObj[0];
				var sBar = aMaxMonthObj[1];
				return oMaxObj[sBar];
			} else {
				var oBarVisibleData = this.getModel("barVisibleModel").getData();
				var sBar = this.oCommonConfigObj.aBarTypes[0].toUpperCase();
				if (!oBarVisibleData.bIsVisConfirmedBar) {
					sBar = this.oCommonConfigObj.aBarTypes[0].toUpperCase();
				} else {
					if (!oBarVisibleData.bIsVisRecoveredBar) {
						sBar = this.oCommonConfigObj.aBarTypes[1].toUpperCase();
					} else if (!oBarVisibleData.bIsVisDeathsBar) {
						sBar = this.oCommonConfigObj.aBarTypes[2].toUpperCase();
					}
				}
				var iLastIndex = this.aFilteredBarData.length - 1;
				return this.aFilteredBarData[iLastIndex][sBar];
			}
		},

		_getMaxMonthObj: function(aData) {
			var aKeys = this._getNotHiddenTypes();
			var sBar = this.oCommonConfigObj.aBarTypes[0].toUpperCase();
			var oMaxObj = aData.reduce(function(oPrev, oCurrent) {
				var sMaxPrevKey = aKeys.reduce(function(sPrevKey, sCurKey) {
					return oPrev[sPrevKey] > oPrev[sCurKey] ? sPrevKey : sCurKey;
				});
				var sMaxCurrentKey = aKeys.reduce(function(sPrevKey, sCurKey) {
					return oCurrent[sPrevKey] > oCurrent[sCurKey] ? sPrevKey : sCurKey;
				});
				if (oPrev[sMaxPrevKey] > oCurrent[sMaxCurrentKey]) {
					sBar = sMaxPrevKey;
					return oPrev;
				} else {
					sBar = sMaxCurrentKey;
					return oCurrent;
				}
			});
			return [oMaxObj, sBar];
		},

		_getMaxKey: function(oDayData) {
			var aKeys = this._getNotHiddenTypes();
			return aKeys.reduce(function(sPrevKey, sCurKey) {
				return oDayData[sPrevKey] > oDayData[sCurKey] ? sPrevKey : sCurKey;
			});
		},

		_getSortedMonth: function(oDayData) {
			if (this.sTypePeriod === this.oCommonConfigObj.sMonthly) {
				oDayData = this.aSortMonthData.filter(function(oMonth) {
					return oMonth.ID === oDayData.ID;
				})[0];
			}
			return oDayData;
		},

		_getTooltipData: function(oDayData) {
			var sTooltipInfo = "<center>" + "<b>" + this.oDateFormat.format(oDayData.DATE) + "</b>" + "</center>";
			var oBarVisibleData = this.getModel("barVisibleModel").getData();
			var iBarTypesLength = this.oCommonConfigObj.aBarTypes.length;
			for (var i = 0; i < iBarTypesLength; i++) {
				if (!oBarVisibleData["bIsVis" + this.oCommonConfigObj.aBarTypes[i] + "Bar"]) {
					sTooltipInfo += this["get" + this.oCommonConfigObj.aBarTypes[i] + "Text"]() + ": " + oDayData[this.oCommonConfigObj.aBarTypes[i].toUpperCase()] + "<br/>";
				}
			}
			sTooltipInfo += this.getSickText() + ": " + (oDayData.CONFIRMED - oDayData.RECOVERED - oDayData.DEATHS) + "<br/>";
			return sTooltipInfo;
		},

		_mouseoverBarEvent: function(oSelRect, oDayData) {
			oDayData = this._getMaxKey(oDayData) === this.oCommonConfigObj.aBarTypes[0].toUpperCase() ? this._getSortedMonth(oDayData) : oDayData;
			if (this.oCommonConfigObj.bSelectedBar) {
				if (oDayData === this.oCommonConfigObj.oSelectedBarData) {
					return;
				} else {
					this._mouseoutBarEvent(this.oCommonConfigObj.oSelectedBarData);
				}
			}
			this._showTooltipOnMouseover(oDayData);

			if (Object.keys(this.oCommonConfigObj.oBoundPrevRect).length && this.oCommonConfigObj.oBoundPrevRect.left === this.oCommonConfigObj.oBoundNewRect.left && 
				this.oCommonConfigObj.oBoundPrevRect.right === this.oCommonConfigObj.oBoundNewRect.right) {
				return;
			}
			// Columns that the cursor is hovering over
			var aBars = this._getBarsByData(oDayData);

			this.oCommonConfigObj.oBoundPrevRect = d3.select(oSelRect).node().getBoundingClientRect();
			this.oPrevBBox = d3.select(oSelRect).node().getBBox();
			this.oCommonConfigObj.oSelectedBarData = oDayData;
			var that = this;
			aBars.forEach(function(oSpecBar) {
				oSpecBar
					.attr("x", function() {
						return that.oPrevBBox.x + +oSpecBar.attr("width") * 0.7 / 4;
					})
					.attr("width", +oSpecBar.attr("width") * 0.7)
					.style("fill", function() {
						return d3.hsl(oSpecBar.style("fill")).darker(0.4);
					});
			});
			this.oCommonConfigObj.oBoundNewRect = d3.select(oSelRect).node().getBoundingClientRect();
			this.oCommonConfigObj.bSelectedBar = true;
			this.oBarChartRect.on("mousemove", function() {
				that._mouseoutBarEvent.call(that);
			});
		},

		_mouseoutBarEvent: function(oDayData) {
			if (!this.oCommonConfigObj.bSelectedBar) {
				return;
			}
			if (!oDayData) {
				oDayData = this.oCommonConfigObj.oSelectedBarData;
			}
			// Columns that the cursor is detached from
			var aBars = this._getBarsByData(oDayData);
			var that = this;
			if (d3.event.pageX < this.oCommonConfigObj.oBoundPrevRect.left || d3.event.pageX > this.oCommonConfigObj.oBoundPrevRect.right ||
				d3.event.pageY < this.oCommonConfigObj.oBoundPrevRect.top || d3.event.pageY > this.oCommonConfigObj.oBoundPrevRect.bottom) {
				aBars.forEach(function(oSpecBar) {
					oSpecBar
						.attr("x", function() {
							return that.oPrevBBox.x;
						})
						.attr("width", +oSpecBar.attr("width")/0.7)
						.style("fill", function() {
							return d3.hsl(oSpecBar.style("fill")).brighter(0.4);
						});
				});
				this.oBarChartRect.on("mousemove", null);
				this.oCommonConfigObj.bSelectedBar = false;
				this.oCommonConfigObj.oBoundPrevRect = {};
			}
			this.oDivTooltip.transition()
				.duration(500)
				.style("opacity", 0);
		},

		_redrawGridLines: function(fChartWidth) {
			var oLines = this.oMainBarChart.selectAll("g.y-axis g.tick")
				.select("line.grid-line")
				.remove();
			oLines = this.oMainBarChart.selectAll("g.y-axis g.tick")
				.append("line")
				.classed("grid-line", true);
			oLines.attr("x1", 0)
				.attr("y1", 0)
				.attr("x2", fChartWidth)
				.attr("y2", 0);
		},

		_showTooltipOnMouseover: function(oDayData) {
			this.oDivTooltip.transition()
				.duration(100)
				.style("opacity", 1);
			var sTooltipInfo = this._getTooltipData(oDayData);
			this.oDivTooltip .html(sTooltipInfo)
				.style("left", (d3.event.clientX) + "px")
				.style("top", (d3.event.clientY - 28) + "px");
			var iRightBorder = this.oCommonConfigObj.iCurrentWidth - 3 * this.oCommonConfigObj.iMarginBar;
			var iBottomBorder = d3.event.clientY - 60;
			var iLeftStyle = 0;
			var iTopStyle = 0;
			if (d3.event.clientX <= iRightBorder && d3.event.clientY <= iBottomBorder) {
				iLeftStyle = d3.event.clientX + 30;
				iTopStyle = d3.event.clientY + 30;
			} else if (d3.event.clientX <= iRightBorder && d3.event.clientY > iBottomBorder) {
				iLeftStyle = d3.event.clientX + 10;
				iTopStyle = d3.event.clientY - 70;
			} else if (d3.event.clientX > iRightBorder && d3.event.clientY <= iBottomBorder) {
				iLeftStyle = d3.event.clientX - 110;
				iTopStyle = d3.event.clientY - 30;
			} else {
				iLeftStyle = d3.event.clientX - 100;
				iTopStyle = d3.event.clientY - 70;
			}
			this.oDivTooltip
				.style("left", iLeftStyle + "px")
				.style("top", iTopStyle + "px");
		},

		_zoomedBar: function() {
			if (this.oCommonConfigObj.bSelectedBar) {
				this.oCommonConfigObj.bSelectedBar = false;
				this.oBarChartRect.on("mousemove", null);
			}
			if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") {
				return;
			}
			if (d3.event && d3.event.transform) {
				this.oCommonConfigObj.oTransformZoomBar = d3.event.transform;
			}
			var fnNewXScale = this.oCommonConfigObj.oTransformZoomBar.rescaleX(this.oScalesBar.fnScaleXBar);
			var fnNewYScale = this.oCommonConfigObj.oTransformZoomBar.rescaleY(this.oScalesBar.fnScaleYBar);
			fnNewXScale.domain(this.oCommonConfigObj.oTransformZoomBar.rescaleX(this.oScalesBar.fnSubScaleX).domain());

			this.oSubBarChart.select(".brush")
				.call(this.fnBrush.move, this.oScalesBar.fnScaleXBar.range().map(this.oCommonConfigObj.oTransformZoomBar.invertX, this.oCommonConfigObj.oTransformZoomBar));

			var aScaleXDomain = fnNewXScale.domain();
			var aBarData = this.sTypePeriod === this.oCommonConfigObj.sMonthly ? this.aMonthData : this.aFilteredBarData;
			var aNewBarData = aBarData.filter(function(oDay) {
				return oDay.DATE >= aScaleXDomain[0] && oDay.DATE <= aScaleXDomain[1];
			});
			var iMaxObjY = this._getMaxY(fnNewXScale);
			fnNewYScale.domain([0, iMaxObjY]).nice();
			this.oGBars.oGBarY.call(this.oAxisBar.fnAxisBarY.scale(fnNewYScale));

			this._drawTickScale(aNewBarData, fnNewXScale);
			this._redrawGridLines(this.iWidthBarChart);
			this._drawOnlyMainBar(aNewBarData, fnNewXScale, fnNewYScale);
		}
	});
});