sap.ui.define([
	"sap/ui/core/Control",
	"sap/ui/core/ResizeHandler"
], function (Control, ResizeHandler) {
	"use strict";
	return Control.extend("my.chart.web.control.PieChart", {
		metadata: {
			properties: {
				data: {
					type: "Element"
				}
			},
			events : {
				changeBarChart: {
					parameters : {
						regionData: {
							type: "object"
						},
						bPushOut: {
							type: "boolean"
						}
					}
				}
			}
		},

		exit: function() {
			ResizeHandler.deregister(this.sResizeHandlerId);
		},

		onBeforeRendering: function() {
			ResizeHandler.deregister(this.sResizeHandlerId);
		},
		
		pieTop: function(oData) {
			if (oData.endAngle - oData.startAngle === 0) {
				return "M 0 0";
			}
			var fStartX = this.iRx * Math.cos(oData.startAngle);
			var fStartY = this.iRy * Math.sin(oData.startAngle);
			var fEndX = this.iRx * Math.cos(oData.endAngle);
			var fEndY = this.iRy * Math.sin(oData.endAngle);
			var aCoord = [];
			aCoord.push("M", fStartX, fStartY, "A", this.iRx, this.iRy, 0, (oData.endAngle - oData.startAngle > Math.PI ? 1 : 0), "1", fEndX, fEndY, "L", 0, 0, 
				"A", 0, 0,"0",(oData.endAngle - oData.startAngle > Math.PI ? 1 : 0), 0, 0, 0, "z");
			return aCoord.join(" ");
		},

		pieOuter: function(oData, iHeight) {
			var fStartAngle = (oData.startAngle > Math.PI ? Math.PI : oData.startAngle);
			var fEndAngle = (oData.endAngle > Math.PI ? Math.PI : oData.endAngle);
			var fStartX = this.iRx * Math.cos(fStartAngle);
			var fStartY = this.iRy * Math.sin(fStartAngle);
			var fEndX = this.iRx * Math.cos(fEndAngle);
			var fEndY = this.iRy * Math.sin(fEndAngle);
			var aCoord = [];
			aCoord.push("M", fStartX, iHeight + fStartY, "A", this.iRx, this.iRy, "0 0 1", fEndX, iHeight + fEndY,
				"L", fEndX, fEndY, "A", this.iRx, this.iRy, "0 0 0", fStartX, fStartY, "z");
			return aCoord.join(" ");
		},

		startWall: function(oData, iHeight) {
			var fStartX = this.iRx * Math.cos(oData.startAngle);
			var fStartY = this.iRy * Math.sin(oData.startAngle);
			var aCoord = [];
			aCoord.push("M", 0, 0, "L", 0, iHeight, "L", fStartX, iHeight + fStartY, "L", fStartX, fStartY, "z");
			return aCoord.join(" ");
		},

		endWall: function(oData, iHeight) {
			var fEndX = this.iRx * Math.cos(oData.endAngle);
			var fEndY = this.iRy * Math.sin(oData.endAngle);
			var aCoord = [];
			aCoord.push("M", 0, 0, "L", 0, iHeight, "L", fEndX, iHeight + fEndY, "L", fEndX, fEndY, "z");
			return aCoord.join(" ");
		},

		mouseoverPieTopSliceEvent: function(oData) {
			var oColor = d3.hsl(this.fnColors(oData.data.name));
			var that = this;
			this.oGPie.select(".topSlice" + "." + "slice-" + oData.data.code)
				.style("fill", function() {
					return oColor.darker(0.4);
				});
			var aWall = ["outerSlice", "startWall", "endWall"];
			aWall.forEach(function(sPiece) {
				that.oGPie.select("." + sPiece + "." + "slice-" + oData.data.code)
					.style("fill", function() {
						return oColor.darker(0.8);
					});
				});
		},

		mouseoverPieWallEvent: function(oData) {
			var oColor = d3.hsl(this.fnColors(oData.data.name));
			var that = this;
			this.oGPie.select(".topSlice" + "." + "slice-" + oData.data.code)
				.style("fill", function() {
					return oColor.darker(0.8);
				});
			var aWall = ["outerSlice", "startWall", "endWall"];
			aWall.forEach(function(sPiece) {
				that.oGPie.select("." + sPiece + "." + "slice-" + oData.data.code)
					.style("fill", function() {
						return oColor.darker(0.4);
					});
				});
		},

		mouseoutPieWallEvent: function(oData) {
			var oColor = d3.hsl(this.fnColors(oData.data.name));
			var that = this;
			this.oGPie.select(".topSlice" + "." + "slice-" + oData.data.code)
				.style("fill", function() {
					return oColor.darker(0.4);
				});
			var aWall = ["outerSlice", "startWall", "endWall"];
			aWall.forEach(function(sPiece) {
				that.oGPie.select("." + sPiece + "." + "slice-" + oData.data.code)
					.style("fill", function() {
						return oColor.darker(0.8);
					});
				});
		},

		mouseoutPieTopSliceEvent: function(oData) {
			var sColor = this.fnColors(oData.data.name);
			var that = this;
			this.oGPie.select(".topSlice" + "." + "slice-" + oData.data.code)
				.style("fill", sColor);
			var aWall = ["outerSlice", "startWall", "endWall"];
			aWall.forEach(function(sPiece) {
				that.oGPie.select("." + sPiece + "." + "slice-" + oData.data.code)
					.style("fill", function() {
						return d3.hsl(sColor).darker(0.4);
					});
				});
		},

		clickPieEvent: function(oSlice, oData) {
			var curTransf = d3.select(oSlice).attr("transform");
			var aPieces = ["topSlice", "outerSlice", "startWall", "endWall", "percent"];
			var aLineLabel = ["label", "polyline"];
			this.oGPie.selectAll("path, text").each(function() {
				d3.select(this)
					.transition()
					.duration(700)
					.attr("transform", "translate(0, 0)");
			});
			this.oPieChart.selectAll("path, text, polyline").each(function() {
				d3.select(this)
					.transition()
					.duration(700)
					.attr("transform", "translate(0, 0)");
			});
			var bPushOut = false;
			if (curTransf && curTransf !== "translate(0, 0)") {
				bPushOut = true;
			}
			this.fireChangeBarChart({
				regionData: oData,
				bPushOut: bPushOut
			});
			if (bPushOut) {
				return;
			}
			var fA = (oData.endAngle + oData.startAngle) / 2;
			var fX = 35 * Math.cos(fA);
			var fY = 35 * Math.sin(fA);
			var that = this;
			aPieces.forEach(function(sPiece) {
				that.oGPie.select("." + sPiece + "." + "slice-" + oData.data.code)
					.transition()
					.duration(700)
					.attr("transform", "translate(" + [fX, fY] + ")");
				});
			aLineLabel.forEach(function(sLineLabel) {
				that.oPieChart.select("." + sLineLabel + "." + "slice-" + oData.data.code)
					.transition()
					.duration(700)
					.attr("transform", "translate(" + [fX, fY] + ")");
				});
		},

		hideArrows: function() {
			this.oPieChart.selectAll(".polyline").remove();
			this.oPieChart.selectAll(".label").remove();
			if (this.oPieChart.select(".legendPie").empty()) {
				var oLegendPie = this.oPieChart.selectAll(".legend")
					.data(this.aPieChartData)
					.enter().append("g")
					.attr("transform", function(d, i) {
						return "translate(" + 24 + "," + (i * 20 + 55) + ")";
					})
					.attr("class", "legendPie");   

				var that = this;
				oLegendPie.append("rect")
					.attr("width", 12)
					.attr("height", 12)
					.attr("fill", function(oData, iIndex) {
						return that.fnColors(iIndex);
					})
					.on("click", function(d) {
						var aPieces = ["topSlice", "outerSlice", "startWall", "endWall", "percent"];
						aPieces.forEach(function(sPiece) {
							var oSlice = that.oGPie.select("." + sPiece + "." + "slice-" + d.data.code);
							var bCurOpacity = +oSlice.data(d).exit()
								.style("opacity");
							oSlice.data(d).exit()
								.style("opacity", bCurOpacity ? 0 : 1);
						});
					});

				oLegendPie.append("text")
					.text(function(oData) {
						return oData.data.name + ",  " + oData.data.value;
					})
					.style("font-size", 14)
					.attr("x", 17)
					.attr("y", 10);
			}
		},

		arrowButtonClick: function(oRadioBut) {
			this.oPieChart.select(".choiseSel").attr("class", "choise");
			d3.select(oRadioBut).attr("class", "choiseSel");
			this.oGPie.selectAll("path, text").each(function() {
				d3.select(this)
					.transition()
					.duration(700)
					.attr("transform", "translate(0, 0)");
			});
			this.oPieChart.selectAll("path, text, polyline").each(function() {
				d3.select(oRadioBut)
					.transition()
					.duration(700)
					.attr("transform", "translate(0, 0)");
			});
			this.hideLegend();
		},

		hideLegend: function() {
			this.oPieChart.selectAll(".legendPie").remove();
			var that = this;
			this.oPieChart.selectAll(".polyline").data(this.aPieChartData).enter()
			  .append("polyline")
				.attr("class", function(d) {
					return "polyline slice-" + d.data.code;
				})
				.transition()
				.duration(100)
				.style("fill", "none")
				.style("stroke", "#808080")
				.style("stroke-begin", "1px")
				.attr("marker-start", "url(#circ)")
				.attrTween("points", function(d) {
					this.curData = this.curData || d;
					var interpolate = d3.interpolate(this.curData, d);
					return function(t) {
						var x = that.iRx * 2 + 60 + Math.cos(interpolate(t).startAngle + (interpolate(t).endAngle - interpolate(t).startAngle) / 2) * (that.iRx + 60);
						var y = that.iRy * 2 + 10 + Math.sin(interpolate(t).startAngle + (interpolate(t).endAngle - interpolate(t).startAngle) / 2) * (that.iRy + 60);
						var x1 = that.iRx * 2 + 60 + Math.cos(interpolate(t).startAngle + (interpolate(t).endAngle - interpolate(t).startAngle) / 2) * that.iRx;
						var y1 = that.iRy * 2 + 10 + Math.sin(interpolate(t).startAngle + (interpolate(t).endAngle - interpolate(t).startAngle) / 2) * that.iRy;
						return [x, y, x1, y1];
					};
			});

			this.oPieChart.selectAll(".label").data(this.aPieChartData).enter()
			  .append("text")
				.attr("class", function(d) {
					return "label slice-" + d.data.code;
				})
				.transition()
				.duration(100)
				.attr("dy", ".35em")
				.attr("x", function(d) {
					return that.iRx * 2 + 60 + Math.cos(d.startAngle + (d.endAngle - d.startAngle) / 2) * (that.iRx + 75);
				})
				.attr("y", function(d) {
					return that.iRy * 2 + 10 + Math.sin(d.startAngle + (d.endAngle - d.startAngle) / 2) * (that.iRy + 75);
				})
				.attr("text-anchor", function(d) {
					var arcAngle = (d.startAngle + (d.endAngle - d.startAngle)) / 2;
					return ((arcAngle > 0) && (arcAngle <= (0.25 * Math.PI))) || ((arcAngle > (0.75 * Math.PI)) && (arcAngle <= (1.1 * Math.PI)))  ? "start" : "end";
				})
				.text(function(d) {
					return d.data.name + ", " + d.data.value;
				}
			);
		},

		drawChart: function() {
			if (!this.iMarginBar) {
				return;
			}
			this.iCurrentWidth = innerWidth - this.iMarginBar;
			this.oPieChart.attr("width", this.iCurrentWidth);
			if (this.iCurrentWidth < 960) {
				this.oPieChart.select("#legendButton")
					.attr("class", "choiseSel");
				this.oPieChart.select("#arrowButton")
					.attr("class", "choise")
					.on("click", null);
				this.hideArrows();
			} else {
				var that = this;
				this.oPieChart.select("#arrowButton")
					.on("click", function() {
						that.arrowButtonClick.call(that, this);
					});			}
			this.oPieChart.select(".pieTitle")
				.attr("x", this.iCurrentWidth / 2 + this.iMarginBar);
		},

		onAfterRendering: function() {
			this.sResizeHandlerId = ResizeHandler.register(this.getParent().getParent(), this.drawChart.bind(this));
			var aDataRegion = this.getData();
			if (!aDataRegion) {
				return;
			}
			this.iMarginBar = 40;
			var iMarginPie = 500;
			var iHeightPie = 40;
			this.iRx = 220;
			this.iRy = 130;
			this.iCurrentWidth = 0;
			var that = this;
			this.oPieChart = d3.select(this.getDomRef()).append("svg")
				.attr("height", "520px")
				.attr("class", "svgStyle");
			this.oGPie = this.oPieChart.append("g")
				.attr("transform", "translate(" + iMarginPie + "," + (iMarginPie / 2 + 20) + ")")
				.attr("class", "slices");

			this.fnColors = d3.scaleOrdinal(["#FFC246", "#FF0000", "#5EBF61", "#d087ed", "#7ac7fa", "#FFC0CB", "#FFFF00"]);
			var fTotal = d3.sum(aDataRegion, function(oData) {
				return oData.value;
			});

			this.aPieChartData = d3.pie().value(function(oData) { 
				return oData.value;
			})(aDataRegion);

			// Circles for choice: arrow or legend
			this.oPieChart.append("circle")
				.attr("id", "legendButton")
				.attr("class", "choiseSel")
				.attr("cx", 30)
				.attr("cy", 35)
				.attr("r", 6)
				.on("click", function() {
					that.oPieChart.select(".choiseSel").attr("class", "choise");
					d3.select(this).attr("class", "choiseSel");
					that.hideArrows();
				});
			this.oPieChart.append("circle")
				.attr("id", "arrowButton")
				.attr("class", "choise")
				.attr("cx", 125)
				.attr("cy", 35)
				.attr("r", 6)
				.on("click", function() {
					that.arrowButtonClick.call(that, this);
				});

			this.oPieChart.append("text")
				.attr("x", 40)
				.attr("y", 35)
				.text("Legend")
				.attr("alignment-baseline", "middle")
				.style("font-size", "15px");
			this.oPieChart.append("text")
				.attr("x", 135)
				.attr("y", 35)
				.text("Arrows")
				.attr("alignment-baseline", "middle")
				.style("font-size", "15px");

			var oLegendPie = that.oPieChart.selectAll(".legend")
				.data(this.aPieChartData)
				.enter()
			  .append("g")
				.attr("class", "legendPie")
				.attr("transform", function(oData, iIndex) {
					return "translate(" + 24 + "," + (iIndex * 20 + 55) + ")";
				});   

			oLegendPie.append("rect")
				.attr("width", 12)
				.attr("height", 12)
				.attr("fill", function(oData, iIndex) {
					return that.fnColors(iIndex);
				})
				.on("click", function(oData) {
					var aPieces = ["topSlice", "outerSlice", "startWall", "endWall", "percent"];
					aPieces.forEach(function(sPiece) {
						var oSlice = that.oGPie.select("." + sPiece + "." + "slice-" + oData.data.code);
						var bCurOpacity = +oSlice.data(oData).exit()
							.style("opacity");
						oSlice.data(oData).exit()
							.style("opacity", bCurOpacity ? 0 : 1);
					});
				});

			oLegendPie.append("text")
				.attr("x", 17)
				.attr("y", 10)
				.text(function(oData) {
					return oData.data.name + ",  " + oData.data.value;
				})
				.style("font-size", 14);

			this.oGPie.append("defs")
			  .append("marker")
				.attr("id", "circ")
				.attr("markerWidth", 6)
				.attr("markerHeight", 6)
				.attr("refX", 3)
				.attr("refY", 3)
			  .append("circle")
				.attr("cx", 3)
				.attr("cy", 3)
				.attr("r", 3)
				.style("fill", "grey");

			this.oGPie.selectAll(".endWall").data(this.aPieChartData).enter()
			  .append("path")
				.attr("class", function(oData) {
					return "endWall slice-" + oData.data.code;
				})
				.attr("d", function(oData) {
					return that.endWall(oData, iHeightPie);
				})
				.style("fill", function(oData) {
					return d3.hsl(that.fnColors(oData.data.name)).darker(0.4);
				})
				.on("click", function(oData) {
					that.clickPieEvent.call(that, this, oData);
				})
				.on("mouseover", function(oData) {
					that.mouseoverPieWallEvent.call(that, oData);
				})
				.on("mouseover", function(oData) {
					that.mouseoutPieWallEvent.call(that, oData);
				});

			this.oGPie.selectAll(".startWall").data(this.aPieChartData).enter()
			  .append("path")
				.attr("class", function(oData) {
					return "startWall slice-" + oData.data.code;
				})
				.attr("d", function(oData) {
					return that.startWall(oData, iHeightPie);
				})
				.style("fill", function(oData) {
					return d3.hsl(that.fnColors(oData.data.name)).darker(0.4);
				})
				.on("click", function(oData) {
					that.clickPieEvent.call(that, this, oData);
				})
				.on("mouseover", function(oData) {
					that.mouseoverPieWallEvent.call(that, oData);
				})
				.on("mouseout", function(oData) {
					that.mouseoutPieWallEvent.call(that, oData);
				});

			this.oGPie.selectAll(".topSlice").data(this.aPieChartData).enter()
			  .append("path")
				.attr("class", function(oData) {
					return "topSlice slice-" + oData.data.code;
				})
				.attr("d", function(oData) {
					return that.pieTop(oData);
				})
				.style("fill", function(oData) {
					return that.fnColors(oData.data.name);
				})
				.on("click", function(oData) {
					that.clickPieEvent.call(that, this, oData);
				})
				.on("mouseover", function(oData) {
					that.mouseoverPieTopSliceEvent.call(that, oData);
				})
				.on("mouseout", function(oData) {
					that.mouseoutPieTopSliceEvent.call(that, oData);
				});

			this.oGPie.selectAll(".outerSlice").data(this.aPieChartData).enter()
			  .append("path")
				.attr("class", function(oData) {
					return "outerSlice slice-" + oData.data.code;
				})
				.style("fill", function(oData) {
					return d3.hsl(that.fnColors(oData.data.name)).darker(0.4);
				})
				.attr("d", function(oData) {
					return that.pieOuter(oData, iHeightPie);
				})
				.on("click", function(oData) {
					that.clickPieEvent.call(that, this, oData);
				})
				.on("mouseover", function(oData) {
					that.mouseoverPieWallEvent.call(that, oData);
				})
				.on("mouseout", function(oData) {
					that.mouseoutPieWallEvent.call(that, oData);
				});

			this.oGPie.selectAll(".percent").data(this.aPieChartData).enter()
			  .append("text")
				.attr("class", function(oData) {
					return "percent slice-" + oData.data.code;
				})
				.attr("x", function(oData) {
					return 0.6 * that.iRx * Math.cos(0.5 * (oData.startAngle + oData.endAngle));
				})
				.attr("y", function(oData) {
					return 0.6 * that.iRy * Math.sin(0.5 * (oData.startAngle + oData.endAngle));
				})
				.text(function(oData) {
					return ((100 * oData.value / fTotal).toFixed(1) + "%");
					// return (Math.round(1000 * (oData.endAngle - oData.startAngle) / (Math.PI * 2)) / 10 + "%");
				});

			this.oPieChart.append("text")
				.attr("class", "pieTitle")
				.attr("x", iMarginPie)
				.attr("y", 20)
				.style("font-size", "20px")
				.attr("font-family", "Times New Roman")
				.attr("text-anchor", "middle")
				.text("Круговая диаграмма. Хроника COVID-19.");

			this.drawChart();
		}
	});
});