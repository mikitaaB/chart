"use strict";
var express = require("express");
const DbUtil = require("../../util/db");

module.exports = function() {
	var app = express.Router();

	app.get("/:countryname", (req, res, next) => {
		var countryname = req.params.countryname;
		DbUtil.execute(`
			SELECT "TIMESERIESID" as "ID", "DATE", "CONFIRMED", "RECOVERED", "DEATHS"
			FROM "chronicleDB.Timeseries"
			WHERE "COUNTRYCODE" = ?`, countryname)
		.then(data => res.json(data))
		.catch(next);
	});
	return app;
};