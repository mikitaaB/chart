const xsenv = require("@sap/xsenv");

module.exports = xsenv.getServices({
	hana: {
		tag: "hana"
	},
	uaa: {
		tag: "xsuaa"
	}
});