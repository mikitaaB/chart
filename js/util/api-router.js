var express = require("express");
var service = require("./service");
var router = express();
var passport = require("passport");
var JWTStrategy = require("@sap/xssec").JWTStrategy;

passport.use("JWT", new JWTStrategy(service.uaa));
router.use(passport.initialize());
router.use(passport.authenticate("JWT", {
	session: false
}));

module.exports = router;