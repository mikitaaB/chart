sap.ui.define([
	"sap/ui/core/Control",
	"sap/ui/core/format/DateFormat",
	"sap/ui/core/Locale",
	"sap/ui/core/ResizeHandler",
	"sap/ui/model/json/JSONModel"
], function (Control, DateFormat, Locale, ResizeHandler, JSONModel) {
	"use strict";
	return Control.extend("my.chart.web.control.LineChart", {
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
			this.aFilteredData = aTimeseriesData.sort(function(oPrevDay, oNextDay) {
				return oPrevDay.DATE > oNextDay.DATE ? 1 : -1;
			});
			this.oCommonConfigObj = {
				aLineTypes: ["Confirmed", "Recovered", "Deaths"],
				aColors: ["#FFA500", "#008000", "#FF0000"],
				sMonthly: "Monthly",
				iMarginLine: 50,
				iWidthLineChart: 0,
				iCurrentWidth: 0,
				aMousePos: [],
				oTransformZoomLine: d3.zoomIdentity
			};
			this.oCommonConfigObj.iCurrentWidth = innerWidth - 2.5 * this.oCommonConfigObj.iMarginLine;
			var iHeaderHeight = this.$().parents().eq(5).children().eq(1).height();
			this.oCommonConfigObj.fHeightLine = innerHeight - iHeaderHeight;
			this.oCommonConfigObj.fHeightMainLine = this.oCommonConfigObj.fHeightLine - 2.5 * this.oCommonConfigObj.iMarginLine;
			var oZoomScaleFactor = {
				iMinScale: 1,
				iMaxScale: 7
			};

			var oLocale = new Locale(sap.ui.getCore().getConfiguration().getLanguage());
			this.oDateFormat = DateFormat.getDateInstance({
				format: "yMMMd"
			}, oLocale);

			var that = this;

			this.fnZoomLine = d3.zoom()
				.scaleExtent([oZoomScaleFactor.iMinScale, oZoomScaleFactor.iMaxScale])
				.on("start", that._mouseoutMarkerEvent.bind(that))
				.on("end", function() {
					that._mouseMoveEventLine.call(that, this);
				})
				.on("zoom", function() {
					that._zoomedLine.call(that);
				});

			this.oLineChart = d3.select(this.getDomRef())
			  .append("svg")
				.attr("class", "svgStyle");

			this.oClipPathLine = this.oLineChart.append("defs").append("clipPath")
				.attr("id", "clip")
			  .append("rect")
				.attr("height", this.oCommonConfigObj.fHeightMainLine);
			this.oMainLineChart = this.oLineChart
			  .append("g")
				.attr("id", "mainChart")
				.attr("class", "mainChart axis")
				.call(this.fnZoomLine);
			this.oLineChartRect = this.oMainLineChart
			  .append("rect")
				.attr("class", "zoom")
				.attr("height", this.oCommonConfigObj.fHeightMainLine)
				.on("wheel", function() {
					that.oCommonConfigObj.aMousePos = d3.mouse(this);
				})
				.on("mousemove", function() {
					that._mouseMoveEventLine.call(that, this);
				})
				.on("mouseout", that._mouseoutMarkerEvent.bind(that));

			this.oScalesLine = {
				fnScaleXLine: d3.scaleTime()
					.domain(d3.extent(this.aFilteredData, function(oData) {
						return oData.DATE;
					})),
				fnScaleYLine: d3.scaleLinear()
					.domain([0, d3.max(this.aFilteredData, function(oData) {
						return oData.CONFIRMED;
					})]).nice()
					.range([this.oCommonConfigObj.fHeightMainLine, 0])
			};

			this.oAxisLine = {
				fnAxisLineX: d3.axisBottom(this.oScalesLine.fnScaleXLine)
					.tickFormat(d3.timeFormat("%d.%m")),
				fnAxisLineY: d3.axisLeft(this.oScalesLine.fnScaleYLine)
			};

			this.oGLines = {
				oGLineX: this.oMainLineChart.append("g")
					.attr("class", "x-axis")
					.attr("transform", "translate(0," + this.oCommonConfigObj.fHeightMainLine + ")"),
				oGLineY: this.oMainLineChart.append("g")
					.attr("class", "y-axis")
					.call(this.oAxisLine.fnAxisLineY)
			};

			var iLineTypesLength = this.oCommonConfigObj.aLineTypes.length;
			for (var i = 0; i < iLineTypesLength; i++) {
				d3.line()
					.x(function(oDayData) {
						return this.oScalesLine.fnScaleXLine(oDayData.DATE);
					})
					.y(function(oDayData) {
						return this.oScalesLine.fnScaleYLine(oDayData[this.oCommonConfigObj.aLineTypes[i].toUpperCase()]);
					});
				this.oMainLineChart.append("g")
				  .append("path")
					.attr("class", "line" + this.oCommonConfigObj.aLineTypes[i])
					.style("stroke", this.oCommonConfigObj.aColors[i])
					.style("stroke-width", 2);
			}

			this.oDivTooltip = d3.select("body").append("div")
				.attr("class", "tooltip");

			this.setModel(new JSONModel({
				bIsVisConfirmedLine: true,
				bIsVisRecoveredLine: true,
				bIsVisDeathsLine: true
			}), "lineVisibleModel");

			this.oLineChart.append("text")
				.attr("class", "lineChartTitle")
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
			var dMinDate = this._getMinDateForScaleX();
			this.onShowIntervalByDate([dMinDate, this.oScalesLine.fnScaleXLine.domain()[1]]);
		},

		onShowHideDataTypes: function(vSelectedKey) {
			var that = this;
			if (!this.oMainLineChart) {
				return;
			}
			var aKeys = [];
			if (vSelectedKey instanceof Array) {
				aKeys = vSelectedKey;
			} else {
				aKeys.push(vSelectedKey);
			}
			var oLineVisibleData = this.getModel("lineVisibleModel").getData();
			var iKeysLength = aKeys.length;
			for (var i = 0; i < iKeysLength; i++) {
				var sKey = aKeys[i];
				var bNewOpacity = oLineVisibleData["bIsVis" + sKey + "Line"];
				this.oMainLineChart.select(".line" + sKey)
					.transition()
					.duration(200)
					.style("opacity", bNewOpacity);
				this.oMainLineChart.selectAll("circle." + sKey.toLowerCase() + "Markers")
					.transition()
					.duration(200)
					.style("opacity", bNewOpacity);
				this.oMainLineChart.selectAll("text."  + sKey.toLowerCase() + "Text")
					.transition()
					.duration(200)
					.style("opacity", bNewOpacity);
				oLineVisibleData["bIsVis" + sKey + "Line"] = !oLineVisibleData["bIsVis" + sKey + "Line"];
				this.oMainLineChart.selectAll("circle." + sKey.toLowerCase() + "Markers")
					.on("mouseover", !bNewOpacity ? null : function(oDayData) {
						this._mouseoverMarkerEvent.call(that, this, oDayData);
					});
			}
			this._drawLegend();

			var dMinDate = this._getMinDateForScaleX();
			this.oScalesLine.fnScaleXLine.domain([dMinDate, this.oScalesLine.fnScaleXLine.domain()[1]]);
			if (this.oCommonConfigObj.oTransformZoomLine.k > 1) {
				var aDates = this.fnNewXScaleLine.domain();
				var iFirstIntervalDatePoint = this.oScalesLine.fnScaleXLine(aDates[0]);
				var iLastIntervalDatePoint = this.oScalesLine.fnScaleXLine(aDates[1]);
				var fnZoomLineTransf = d3.zoomIdentity;
				if (aDates[0] < this._getMinDateForScaleX(this.oScalesLine.fnScaleXLine)) {
					fnZoomLineTransf.k = this.oCommonConfigObj.oTransformZoomLine.k;
				} else {
					var fK = this.oCommonConfigObj.iWidthLineChart / (iLastIntervalDatePoint - iFirstIntervalDatePoint);
					fnZoomLineTransf = this.oCommonConfigObj.oTransformZoomLine = d3.zoomIdentity.translate((-fK * iFirstIntervalDatePoint), 0).scale(fK);
				}
				this.oLineChartRect.transition()
					.duration(300)
					.call(this.fnZoomLine.transform, fnZoomLineTransf);
			}
			this._drawAxis(this.oScalesLine.fnScaleXLine, this.oScalesLine.fnScaleYLine);
		},

		onShowIntervalByDate: function(aDates) {
			if (!aDates[1] && !aDates[0]) {
				return;
			}
			if (!aDates[1] || aDates[1] > this.aFilteredData[this.aFilteredData.length - 1].DATE) {
				aDates[1] = this.aFilteredData[this.aFilteredData.length - 1].DATE;
			}
			if (!aDates[0] || aDates[0] < this.aFilteredData[0].DATE) {
				aDates[0] = this.aFilteredData[0].DATE;
			}
			var aLineData = this.sTypePeriod === "Monthly" ? this.aMonthData : this.aFilteredData;
			var aNewLineData = aLineData.filter(function(oDayData) {
				return oDayData.DATE >= aDates[0] && oDayData.DATE <= aDates[1];
			});
			this.oScalesLine.fnScaleXLine.domain(d3.extent(aNewLineData, function(oDayData) {
				return oDayData.DATE;
			}));
			this._drawAxis(this.oScalesLine.fnScaleXLine, this.oScalesLine.fnScaleYLine);
			this._drawTickScale(aNewLineData);
		},

		// Adapts the chart for a small window size. Show last 10 dates
		_adaptChart: function() {
			if (this.oCommonConfigObj.iCurrentWidth <= window.screen.width * 0.6) {
				var iDatePoint = this.oScalesLine.fnScaleXLine(this.aFilteredData[this.aFilteredData.length - 11].DATE);
				var iLastDatePoint = this.oScalesLine.fnScaleXLine(this.aFilteredData[this.aFilteredData.length - 1].DATE);
				var fK = this.oCommonConfigObj.iWidthLineChart / (iLastDatePoint - iDatePoint);
				this.oCommonConfigObj.oTransformZoomLine = d3.zoomIdentity.translate((-fK * iDatePoint), 0).scale(fK);
			} else {
				this.oCommonConfigObj.oTransformZoomLine = d3.zoomIdentity;
			}
			this.oLineChartRect.transition()
				.duration(300)
				.call(this.fnZoomLine.transform, this.oCommonConfigObj.oTransformZoomLine);
		},

		_createMonthlyData: function() {
			this.aMonthData = [];
			var aDataByMonth = d3.nest().key(function(oDayData) {
				return new Date(oDayData.DATE).getMonth();
			}).entries(this.aFilteredData);
			this.aMonthData = aDataByMonth.map(function(oMonth) {
				return oMonth.values[0];
			});
			var aLastMonth = aDataByMonth[aDataByMonth.length-1].values;
			if (aLastMonth.length > 1) {
				this.aMonthData.push(aLastMonth[aLastMonth.length-1]);
			}
		},

		_drawChart: function() {
			this.oCommonConfigObj.iCurrentWidth = innerWidth - 2.5 * this.oCommonConfigObj.iMarginLine;
			this.iMarginLeftLine = this.oCommonConfigObj.iCurrentWidth <= window.screen.width * 0.75 ? 0 : 110;
			this._drawLegend();

			this.oMainLineChart
				.attr("transform", "translate(" + (1.5 * this.oCommonConfigObj.iMarginLine + this.iMarginLeftLine) + "," + (1.5 * this.oCommonConfigObj.iMarginLine) + ")");
			this.oCommonConfigObj.iWidthLineChart = this.oCommonConfigObj.iCurrentWidth - 2 * this.oCommonConfigObj.iMarginLine - this.iMarginLeftLine;
			this.oLineChart
				.attr("width", this.oCommonConfigObj.iCurrentWidth)
				.attr("height", this.oCommonConfigObj.fHeightLine);

			this._drawGridLines(this.oCommonConfigObj.iWidthLineChart);

			this.fnZoomLine
				.translateExtent([[0, 0], [this.oCommonConfigObj.iWidthLineChart, this.oCommonConfigObj.fHeightMainLine]])
				.extent([[0, 0], [this.oCommonConfigObj.iWidthLineChart, this.oCommonConfigObj.fHeightMainLine]]);

			this.oScalesLine.fnScaleXLine.range([0, this.oCommonConfigObj.iWidthLineChart]);

			this.oMainLineChart.append("g")
			  .append("path")
				.attr("class", "x-mouse-line");
			this.oMainLineChart.append("g")
			  .append("path")
				.attr("class", "y-mouse-line");

			this.oClipPathLine.attr("width", this.oCommonConfigObj.iWidthLineChart);
			this.oLineChartRect.attr("width", this.oCommonConfigObj.iWidthLineChart);

			this._adaptChart();

			this.oLineChart.select(".lineChartTitle")
				.attr("x", this.oCommonConfigObj.iWidthLineChart / 2 + this.oCommonConfigObj.iMarginLine + this.iMarginLeftLine);
		},

		_drawLegend: function() {
			this.aLegendData = [];
			var aLegendColors = [];
			var oLineVisibleData = this.getModel("lineVisibleModel").getData();
			var iVisibleDataLength = Object.keys(oLineVisibleData).length;
			for (var i = 0; i < iVisibleDataLength; i++) {
				if (!oLineVisibleData["bIsVis" + this.oCommonConfigObj.aLineTypes[i] + "Line"]) {
					this.aLegendData.push(this["get" + this.oCommonConfigObj.aLineTypes[i] + "Text"]());
					aLegendColors.push(this.oCommonConfigObj.aColors[i]);
				}
			}
			if (!aLegendColors.length) {
				return;
			}
			this.aScaleLegendColors = d3.scaleOrdinal(aLegendColors);
			this.oLineChart.selectAll(".legendLineLeft").remove();
			this.oLineChart.selectAll(".legendLineTop").remove();
			if (this.iMarginLeftLine) {
				this._drawLeftLegend();
			} else {
				this._drawTopLegend();
			}
		},

		_drawLeftLegend: function() {
			var that = this;
			var oLegendGroup = this.oLineChart
			  .append("g")
				.attr("class", "legendGroup");
			var oLegendLineLeft = oLegendGroup.selectAll(".legendLineLeft")
				.data(this.aLegendData)
				.enter()
			  .append("g")
				.attr("class", "legendLineLeft")
				.attr("transform", function(oDayData, iIndex) {
					return "translate(0," + (iIndex * 30) + ")";
				});
			oLegendLineLeft.append("circle")
				.attr("cx", 20)
				.attr("cy", this.oCommonConfigObj.fHeightLine / 3)
				.attr("r", 6.5)
				.attr("fill", function(oDayData, iIndex) {
					return that.aScaleLegendColors(iIndex);
				});
			oLegendLineLeft.append("text")
				.attr("x", 35)
				.attr("y", this.oCommonConfigObj.fHeightLine / 3)
				.attr("dy", ".40em")
				.style("font-size", "15px")
				.text(function(sLegendText) {
					return sLegendText;
				});
		},

		_drawTopLegend: function() {
			var that = this;
			var oLegendGroup = this.oLineChart
			  .append("g")
				.attr("class", "legendGroup");
			var oLegendLineTop = oLegendGroup.selectAll(".legendLineTop")
				.data(this.aLegendData)
				.enter()
			  .append("g")
				.attr("class", "legendLineTop")
				.attr("transform", function(oDayData, iIndex) {
					return "translate(" + (iIndex * 120) + ",0)";
				});
			oLegendLineTop.append("circle")
				.attr("cx", 40)
				.attr("cy", 40)
				.attr("r", 6.5)
				.attr("fill", function(oDayData, iIndex) {
					return that.aScaleLegendColors(iIndex);
				});
			oLegendLineTop.append("text")
				.attr("x", 55)
				.attr("y", 40)
				.attr("dy", ".40em")
				.style("font-size", "15px")
				.text(function(sLegendText) {
					return sLegendText;
				});
		},

		_drawAxis: function(fnScaleX, fnScaleY) {
			var aNewLineData = this.sTypePeriod === this.oCommonConfigObj.sMonthly ? this.aMonthData : this.aFilteredData;
			var aScaleXLineDomain = fnScaleX.domain();
			var aFiltLineData = aNewLineData.filter(function(oDay) {
				return oDay.DATE >= aScaleXLineDomain[0] && oDay.DATE <= aScaleXLineDomain[1];
			});
			this.oGLines.oGLineX.transition()
				.duration(500)
				.call(this.oAxisLine.fnAxisLineX.scale(fnScaleX));
			this._drawTickScale(aFiltLineData);

			var iMaxObjY = this._getMaxY(fnScaleX);
			fnScaleY.domain([0, iMaxObjY]).nice();
			this.oGLines.oGLineY.call(this.oAxisLine.fnAxisLineY.scale(fnScaleY));
			var aScaleXDomain = fnScaleX.domain();
			this._drawGridLines(this.oCommonConfigObj.iWidthLineChart);
			this._drawLinesMarkers(fnScaleX, fnScaleY, aScaleXDomain);
		},

		_drawGridLines: function(fChartWidth) {
			var oLines = this.oMainLineChart.selectAll("g.y-axis g.tick")
				.select("line.grid-line")
				.remove();
			oLines = this.oMainLineChart.selectAll("g.y-axis g.tick")
			  .append("line")
				.classed("grid-line", true);
			oLines.attr("x1", 0)
				.attr("y1", 0)
				.attr("x2", fChartWidth)
				.attr("y2", 0);
		},

		_drawLines: function(aLineData, fnScaleXLine, fnScaleYLine, oLineOpacityData) {
			var fnLineConfirmed = d3.line()
				.x(function(oDayData) {
					return fnScaleXLine(oDayData.DATE);
				})
				.y(function(oDayData) {
					return fnScaleYLine(oDayData.CONFIRMED);
				})
				.defined(function(oDayData) {
					return oDayData.CONFIRMED > 0;
				});
			var fnLineRecovered = d3.line()
				.x(function(oDayData) {
					return fnScaleXLine(oDayData.DATE);
				})
				.y(function(oDayData) {
					return fnScaleYLine(oDayData.RECOVERED);
				})
				.defined(function(oDayData) {
					return oDayData.RECOVERED > 0;
				});
			var fnLineDeaths = d3.line()
				.x(function(oDayData) {
					return fnScaleXLine(oDayData.DATE);
				})
				.y(function(oDayData) {
					return fnScaleYLine(oDayData.DEATHS);
				})
				.defined(function(oDayData) {
					return oDayData.DEATHS > 0;
				});
			this.oMainLineChart.select(".lineConfirmed")
				.attr("d", fnLineConfirmed(aLineData))
				.style("opacity", oLineOpacityData.Confirmed);
			this.oMainLineChart.select(".lineRecovered")
				.attr("d", fnLineRecovered(aLineData))
				.style("opacity", oLineOpacityData.Recovered);
			this.oMainLineChart.select(".lineDeaths")
				.attr("d", fnLineDeaths(aLineData))
				.style("opacity", oLineOpacityData.Deaths);
		},

		_drawMarkers: function(aLineData, fnScaleXLine, fnScaleYLine, aScaleXDomain, oLineOpacityData) {
			var that = this;
			var fCircleDistance = fnScaleXLine(aLineData[aLineData.length - 1].DATE) - fnScaleXLine(aLineData[aLineData.length - 2].DATE);
			var iFilterCount = 2;
			if (fCircleDistance < 9) {
				iFilterCount = fCircleDistance < 4.5 ? 9 : 7;
			} else {
				iFilterCount = fCircleDistance < 26 ? 3 : 1;
			}
			var iLineTypesLength = this.oCommonConfigObj.aLineTypes.length;
			for (var i = 0; i < iLineTypesLength; i++) {
				var sKey = this.oCommonConfigObj.aLineTypes[i];
				this.oMainLineChart.selectAll("circle." + sKey.toLowerCase() + "Markers").remove();
				this.oMainLineChart.selectAll("." + sKey.toLowerCase() + "Text").remove();
				this.oNode = this.oMainLineChart.append("g")
					.selectAll("g")
					.data(aLineData.filter(function(oData) {
						return oData[sKey.toUpperCase()] > 0;
					}))
					.enter();
				this.oNode.append("circle")
					.attr("class", sKey.toLowerCase() + "Markers")
					.attr("r", 2.5)
					.on("mouseover", function(oDayData) {
						that._mouseoverMarkerEvent.call(that, this, oDayData);
					})
					.on("mouseout", that._mouseoutMarkerEvent.bind(that))
					.attr("cx", function(oDayData) {
						return fnScaleXLine(oDayData.DATE);
					})
					.attr("cy", function(oDayData) {
						return fnScaleYLine(oDayData[sKey.toUpperCase()]);
					})
					.style("opacity", oLineOpacityData[sKey]);
				this.oNode.append("text")
					.attr("class", sKey.toLowerCase() + "Text")
					.filter(function(oDayData, iIndex) {
						if (sKey === that.oCommonConfigObj.aLineTypes[0]) {
							return iIndex % iFilterCount === 0 && oDayData.DATE >= aScaleXDomain[0] && oDayData.DATE <= aScaleXDomain[1];
						} else {
							return iIndex === that.oNode.data().length - 1;
						}
					})
					.text(function(oDayData) {
						return oDayData[sKey.toUpperCase()];
					})
					.style("opacity", oLineOpacityData[sKey])
					.attr("x", function (oDayData) {
						var iValueLength = (oDayData[sKey.toUpperCase()] + "").length;
						var iOneDigitPadding = 6;
						return fnScaleXLine(oDayData.DATE) - (iValueLength * iOneDigitPadding);
					})
					.attr("y", function (oDayData) {
						return fnScaleYLine(oDayData[sKey.toUpperCase()]) - 7;
					});
			}
		},

		_drawLinesMarkers: function(fnScaleXLine, fnScaleYLine, aScaleXDomain) {
			var aLineData = this.sTypePeriod === this.oCommonConfigObj.sMonthly ? this.aMonthData : this.aFilteredData;
			var oLineVisibleData = this.getModel("lineVisibleModel").getData();
			this.oDivTooltip.transition()
				.duration(100)
				.style("opacity", 0);
			var oLineOpacityData = {
				"Confirmed": oLineVisibleData.bIsVisConfirmedLine ? 0 : 1,
				"Recovered": oLineVisibleData.bIsVisRecoveredLine ? 0 : 1,
				"Deaths": oLineVisibleData.bIsVisDeathsLine ? 0 : 1
			};
			this._drawLines(aLineData, fnScaleXLine, fnScaleYLine, oLineOpacityData);
			this._drawMarkers(aLineData, fnScaleXLine, fnScaleYLine, aScaleXDomain, oLineOpacityData);
		},

		_drawTickScale: function(aLineData) {
			var fnNewScaleXLine = this.oCommonConfigObj.oTransformZoomLine.rescaleX(this.oScalesLine.fnScaleXLine);
			var aScaleXLineDomain = this.oScalesLine.fnScaleXLine.domain();
			var fnTickScale = d3.scalePow([aLineData.length, 0], [aLineData.length / 30, 0]).exponent(.001);
			var iBrushValueLine = this.oScalesLine.fnScaleXLine(aScaleXLineDomain[1]) - this.oScalesLine.fnScaleXLine(aScaleXLineDomain[0]);
			var iTickValueMultiplier = Math.ceil(Math.abs(fnTickScale(iBrushValueLine)));
			var aFilteredTickValues = aLineData.reduce(function(aAccum, oCurData, iIndex) {
				return iIndex % iTickValueMultiplier === 0 ? aAccum.concat(oCurData.DATE) : aAccum;
			}, []);
			this.oGLines.oGLineX.call(this.oAxisLine.fnAxisLineX.scale(fnNewScaleXLine).tickValues(aFilteredTickValues));
			var fTickDistance = this.oScalesLine.fnScaleXLine(aFilteredTickValues[aFilteredTickValues.length - 1]) - 
				this.oScalesLine.fnScaleXLine(aFilteredTickValues[aFilteredTickValues.length - 2]);
			if (fTickDistance <= 30) {
				this.oGLines.oGLineX.selectAll("text")
					.attr("dx", "-.8em")
					.attr("dy", ".15em")
					.attr("transform", "rotate(-65)")
					.style("text-anchor", "end");
			} else {
				this.oGLines.oGLineX.selectAll("text")
					.attr("dx", "0em")
					.attr("dy", ".5em")
					.attr("transform", "rotate(0)")
					.style("text-anchor", "middle");
			}
		},

		_getMaxY: function(fnScale) {
			var sLine = this.oCommonConfigObj.aLineTypes[0].toUpperCase();
			var aScaleDomainX = fnScale.domain();
			var aLineData = this.sTypePeriod === this.oCommonConfigObj.sMonthly ? this.aMonthData : this.aFilteredData;
			var aNewLineData = aLineData.filter(function(oDay) {
				return oDay.DATE >= aScaleDomainX[0] && oDay.DATE <= aScaleDomainX[1];
			});
			var oMaxObj = {};
			if (this.sTypePeriod === this.oCommonConfigObj.sMonthly) {
				var aKeys = this._getNotHiddenTypes();
				oMaxObj = aNewLineData.reduce(function(oPrev, oCurrent) {
                    var sMaxPrevKey = aKeys.reduce(function(sPrevKey, sCurKey) {
						return oPrev[sPrevKey] > oPrev[sCurKey] ? sPrevKey : sCurKey;
					});
                    var sMaxCurrentKey = aKeys.reduce(function(sPrevKey, sCurKey) {
						return oCurrent[sPrevKey] > oCurrent[sCurKey] ? sPrevKey : sCurKey;
					});
					if (oPrev[sMaxPrevKey] > oCurrent[sMaxCurrentKey]) {
						sLine = sMaxPrevKey;
						return oPrev;
					} else {
						sLine = sMaxCurrentKey;
						return oCurrent;
					}
				});
			} else {
				var oLineVisibleData = this.getModel("lineVisibleModel").getData();
				var iLineTypesLength = this.oCommonConfigObj.aLineTypes.length;
				for (var i = 0; i < iLineTypesLength; i++) {
					if (!oLineVisibleData["bIsVis" + this.oCommonConfigObj.aLineTypes[i] + "Line"]) {
						sLine = this.oCommonConfigObj.aLineTypes[i].toUpperCase();
						break;
					}
				}
				oMaxObj = aNewLineData.reduce(function(oPrev, oCurrent) {
					return (oPrev[sLine] > oCurrent[sLine]) ? oPrev : oCurrent;
				});
			}
			return oMaxObj[sLine];
		},

		_getMinDateForScaleX: function() {
			var aNotHiddenTypes = this._getNotHiddenTypes();
			var aNewLineData = this.sTypePeriod === this.oCommonConfigObj.sMonthly ? this.aMonthData : this.aFilteredData;
			var dMinDate = new Date();
			var aDates = [];
			if (aNotHiddenTypes.length > 1) {
				var iLineDataLength = aNewLineData.length;
				for (var i = 0; i < iLineDataLength; i++) {
					for (var j = 0; j < aNotHiddenTypes.length; i++) {
						if (aNewLineData[i][aNotHiddenTypes[j]] > 0) {
							aDates.push(aNewLineData[i].DATE);
							aNotHiddenTypes.splice(j, 1);
							break;
						}
					}
				}
				dMinDate = aDates.sort(function(dPrevDate, dNextDate) {
					return dPrevDate - dNextDate;
				})[0];
			} else {
				dMinDate = aNewLineData.filter(function(oDay) {
					return oDay[aNotHiddenTypes[0]] > 0;
				})[0].DATE;
			}
			return dMinDate;
		},

		_getNotHiddenTypes: function() {
			var oLineVisibleData = this.getModel("lineVisibleModel").getData();
			var aKeys = this.oCommonConfigObj.aLineTypes.slice();
			var aLineTypesLength = this.oCommonConfigObj.aLineTypes.length;
			for (var i = 0; i < aLineTypesLength; i++) {
				if (oLineVisibleData["bIsVis" + this.oCommonConfigObj.aLineTypes[i] + "Line"]) {
					var iIndex = aKeys.indexOf(this.oCommonConfigObj.aLineTypes[i]);
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

		_getTooltipData: function(oDayData) {
			var oLineVisibleData = this.getModel("lineVisibleModel").getData();
			var sTooltipInfo = "<center>" + "<b>" + this.oDateFormat.format(oDayData.DATE) + "</b>" + "</center>";
			var iLineTypesLength = this.oCommonConfigObj.aLineTypes.length;
			for (var i = 0; i < iLineTypesLength; i++) {
				if (!oLineVisibleData["bIsVis" + this.oCommonConfigObj.aLineTypes[i] + "Line"]) {
					sTooltipInfo += this["get" + this.oCommonConfigObj.aLineTypes[i] + "Text"]() + ": " + oDayData[this.oCommonConfigObj.aLineTypes[i].toUpperCase()] + "<br/>";
				}
			}
			sTooltipInfo += this.getSickText() + ": " + (oDayData.CONFIRMED - oDayData.RECOVERED - oDayData.DEATHS) + "<br/>";
			return sTooltipInfo;
		},

		_mouseMoveEventLine: function(oSelObj) {
			if (d3.event.type !== "end") {
				this.oCommonConfigObj.aMousePos = d3.mouse(oSelObj);
			}
			if (d3.mouse(oSelObj)[0] > this.oCommonConfigObj.iWidthLineChart || d3.mouse(oSelObj)[0] < 0 || 
				d3.event.type === "end" && this.fPrevScaleLevel === this.oCommonConfigObj.oTransformZoomLine.k) {
				return;
			}
			d3.select(".y-mouse-line")
				.style("opacity", "1");
			var aLineData = this.sTypePeriod === this.oCommonConfigObj.sMonthly ? this.aMonthData : this.aFilteredData;
			var fnTransformX = this.oCommonConfigObj.oTransformZoomLine.rescaleX(this.oScalesLine.fnScaleXLine);
			var dDateOnScaleX = fnTransformX.invert(this.oCommonConfigObj.aMousePos[0]);
			var fnBisectDate = d3.bisector(function(oData) {
				return oData.DATE;
			}).left;
			var iIndex = fnBisectDate(aLineData, dDateOnScaleX);
			var oDataObj = aLineData[iIndex];
			var oDataObjPrev = aLineData[iIndex-1];
			// find near data to mouse position
			var oNearData = dDateOnScaleX - oDataObjPrev.DATE > oDataObj.DATE - dDateOnScaleX ? oDataObj : oDataObjPrev;
			var fLineX = fnTransformX(oNearData.DATE);
			var that = this;
			d3.select(".y-mouse-line")
				.attr("d", function() {
					return "M" + fLineX + "," + that.oCommonConfigObj.fHeightMainLine + " " + fLineX + "," + 0;
				});
			this.oDivTooltip.transition()
				.duration(100)
				.style("opacity", 1);
			var sTooltipInfo = this._getTooltipData(oNearData);
			this.oDivTooltip .html(sTooltipInfo)
				.style("left", (d3.event.clientX) + "px")
				.style("top", (d3.event.clientY - 28) + "px");
			this._showTooltip();
		},

		_mouseoverMarkerEvent: function(oSelMarker, oDayData) {
			this.oDivTooltip.transition()
				.duration(100)
				.style("opacity", 1);
			var sTooltipInfo = this._getTooltipData(oDayData);
			this.oDivTooltip .html(sTooltipInfo)
				.style("left", (d3.event.clientX) + "px")
				.style("top", (d3.event.clientY - 28) + "px");
			this._showTooltip();
			var aMouse = d3.mouse(oSelMarker);
			var that = this;
			d3.select(".x-mouse-line")
				.style("opacity", "1");
			d3.select(".y-mouse-line")
				.style("opacity", "1");
			d3.select(".y-mouse-line")
				.attr("d", function() {
					return "M" + aMouse[0] + "," + that.oCommonConfigObj.fHeightMainLine + " " + aMouse[0] + "," + aMouse[1];
				});
			d3.select(".x-mouse-line")
				.attr("d", function() {
					return "M" + 0 + "," + aMouse[1] + " " + aMouse[0] + "," + aMouse[1];
				});
		},

		_mouseoutMarkerEvent: function() {
			this.oDivTooltip.transition()
				.duration(500)
				.style("opacity", 0);
			d3.select(".x-mouse-line")
				.style("opacity", "0");
			d3.select(".y-mouse-line")
				.style("opacity", "0");
			this.fPrevScaleLevel = this.oCommonConfigObj.oTransformZoomLine.k;
		},

		_showTooltip: function() {
			var iRightBorder = this.oCommonConfigObj.iWidthLineChart - 3 * this.oCommonConfigObj.iMarginLine;
			var iBottomBorder = this.$().parent().parent().parent().height();
			var iLeftStyle = 0;
			var iTopStyle = 0;
			if (d3.event.pageX <= iRightBorder && d3.event.pageY <= iBottomBorder) {
				iLeftStyle = (d3.event.pageX + 30);
				iTopStyle = (d3.event.pageY + 30);
			} else if (d3.event.pageX <= iRightBorder && d3.event.pageY > iBottomBorder) {
				if (d3.event.pageY < 150 && (this.oCommonConfigObj.fHeightMainLine - 60) > d3.event.offsetY) {
					iLeftStyle = (d3.event.pageX + 10);
					iTopStyle = (d3.event.pageY + 20);
				} else {
					iLeftStyle = (d3.event.pageX + 10);
					iTopStyle = (d3.event.pageY - 70);
				}
			} else if (d3.event.pageX > iRightBorder && d3.event.pageY <= iBottomBorder) {
				iLeftStyle = (d3.event.pageX - 110);
				iTopStyle = (d3.event.pageY - 30);
			} else {
				if (d3.event.pageY < 150 && (this.oCommonConfigObj.fHeightMainLine - 60) > d3.event.offsetY) {
					iLeftStyle = (d3.event.pageX - 100);
					iTopStyle = (d3.event.pageY + 20);
				} else {
					iLeftStyle = (d3.event.pageX - 100);
					iTopStyle = (d3.event.pageY - 70);
				}
			}
			this.oDivTooltip
				.style("left", iLeftStyle + "px")
				.style("top", iTopStyle + "px");
		},

		_zoomedLine: function() {
			if (d3.event && d3.event.transform) {
				this.oCommonConfigObj.oTransformZoomLine = d3.event.transform;
			}
			this.fnNewXScaleLine = this.oCommonConfigObj.oTransformZoomLine.rescaleX(this.oScalesLine.fnScaleXLine);
			this.fnNewYScaleLine = this.oCommonConfigObj.oTransformZoomLine.rescaleY(this.oScalesLine.fnScaleYLine);
			this._drawAxis(this.fnNewXScaleLine, this.fnNewYScaleLine);
		}
	});
});