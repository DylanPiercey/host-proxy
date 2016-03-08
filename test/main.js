var fs = require("fs");
var test = require("tape");
var http = require("http");
var https = require("https");
var request = require("supertest");
var createProxy = require("../");

test("required fields", function (t) {
	t.plan(1);
	t.throws(createProxy.bind(null), TypeError, "host resolver must be a function.");
});

test("proxy http", function (t) {
	t.plan(3);

	// Start up an example http server.
	var server = http.createServer(function (req, res) {
		res.end("HTTP-Server");
	}).listen();

	// Start the proxy.
	var proxy = createProxy(function (hostname) {
		// Only handle localhost
		if (hostname === "localhost") {
			return server.address();
		}
	}).listen();

	// Valid host proxy
	request("http://localhost:" + proxy.address().port)
		.get("/")
		.end(function (err, res) {
			if (err) t.fail(err);
			t.equals(res.text, "HTTP-Server", "server should respond");
		});

	// Invalid host proxy.
	request("http://127.0.0.1:" + proxy.address().port)
		.get("/")
		.end(function (err, res) {
			t.ok(err, "error should exist");
			t.equals(err.code, "ECONNRESET", "connection should fail");
		});
});


test("proxy https", function (t) {
	t.plan(3);

	// Allow self signed certs.
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
	// Start up an example http server.
	var options = {
		key: fs.readFileSync(__dirname + "/cert/privkey.pem"),
		cert: fs.readFileSync(__dirname + "/cert/cert.pem")
	};
	var server = https.createServer(options, function (req, res) {
		res.end("HTTPS-Server");
	}).listen();

	// Start the proxy.
	var proxy = createProxy(function (hostname) {
		// Only handle localhost
		if (hostname === "localhost") {
			return server.address();
		}
	}).listen();

	// Valid host proxy
	request("https://localhost:" + proxy.address().port)
		.get("/")
		.end(function (err, res) {
			if (err) t.fail(err);
			t.equals(res.text, "HTTPS-Server", "server should respond");
		});

	// Invalid host proxy.
	request("https://127.0.0.1:" + proxy.address().port)
		.get("/")
		.end(function (err, res) {
			t.ok(err, "error should exist");
			t.equals(err.code, "ECONNRESET", "connection should fail");
		});
});
