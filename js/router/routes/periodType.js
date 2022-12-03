"use strict";
var express = require("express");
const DbUtil = require("../../util/db");

module.exports = function() {
	var app = express.Router();

	app.get("/:lang", (req, res, next) => {
		var lang = req.params.lang;
		var colName = "PERIODNAME" + lang.toUpperCase();
		DbUtil.execute(`
			SELECT "PERIODCODE", ${colName} as "PERIODNAME"
			FROM "chronicleDB.PeriodType"`)
		.then(data => res.json(data))
		.catch(next);
	});
	return app;
};