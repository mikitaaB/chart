"use strict";
var express = require("express");
const DbUtil = require("../../util/db");

module.exports = function() {
	var app = express.Router();

	app.get("/:lang", (req, res, next) => {
		var lang = req.params.lang;
		var colName = "CHARTNAME" + lang.toUpperCase();
		DbUtil.execute(`
			SELECT "CHARTCODE", ${colName} as "CHARTNAME"
			FROM "chronicleDB.ChartType"`)
		.then(data => res.json(data))
		.catch(next);
	});

	return app;
};