"use strict";

module.exports = (app, server) => {
	app.use("/country", require("./routes/country")());
	app.use("/timeseries", require("./routes/timeseries")());
	app.use("/periodType", require("./routes/periodType")());
	app.use("/chartType", require("./routes/chartType")());

	app.use( (err, req, res, next) => {
		res.status(500).send(`System Error ${JSON.stringify(err)}`);
	});
};