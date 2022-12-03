var http = require("http");
var port = process.env.PORT || 3000;
const server = http.createServer();
const app = require("express")();
const router = require("./util/api-router");

require("./router")(app, server);
app.use("/", router);

server.on("request", app);
server.listen(port, function() {
	console.log("Server listening on port %d", port);
});