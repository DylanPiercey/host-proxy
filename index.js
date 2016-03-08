"use strict";

var net        = require("net");
module.exports = createProxy;

/**
 * Creates a proxy server that will forward a hostname to a specific address.
 *
 * @params {Function} findAddress - a function that when given a hostname returns a valid address object.
 * @returns {net.Server}
 */
function createProxy (findAddress) {
	if (typeof findAddress !== "function") {
		throw new TypeError("host resolver must be a function");
	}
	return net.createServer(function (conn) {
		conn.once("data", function (data) {
			var secure = data[0] === 22;
			var hostname = secure ? parseSNI(data) : parseHeader(data);
			var address = findAddress(hostname);
			if (address == null) return conn.end();
			var proxy = net.createConnection(address);
			proxy.write(data);
			conn.pipe(proxy).pipe(conn);
		});
	});
}

/**
 * Parses initial http header for a hostname.
 *
 * @params {Buffer} data
 * @returns {String|null}
 */
 function parseHeader (data) {
 	var match = data.toString("utf8").match(/^Host: ([^:\r\n]+).*$/im);
 	return match && match[1];
 }

/**
 * Parses initial https SNI data for a hostname.
 *
 * @params {Buffer} data
 * @returns {String|null}
 */
function parseSNI (data) {
	// Session ID Length (static position)
	var currentPos = 43;
	// Skip session IDs
	currentPos += 1 + data[currentPos];

	// skip Cipher Suites
	currentPos += 2 + data.readInt16BE(currentPos);

	// skip compression methods
	currentPos += 1 + data[currentPos];

	// We are now at extensions!
	currentPos += 2; // ignore extensions length
	while (currentPos < data.length) {
		if (data.readInt16BE(currentPos) === 0) {
			// we have found an SNI
			var sniLength = data.readInt16BE(currentPos + 2);
			currentPos += 4;
			if (data[currentPos] != 0) {
				// the RFC says this is a reserved host type, not DNS
				return null;
			}
			currentPos += 5;
			return data.toString('utf8', currentPos, currentPos + sniLength - 5);
		} else {
			currentPos += 4 + data.readInt16BE(currentPos + 2);
		}
	}
	return null;
}
