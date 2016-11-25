'use strict'

var net = require('net')
var url = require('url')
var hostReg = /^Host: ([^:\r\n]+).*$/im
var wwwReg = /^www\./
var ignoreErrors = { ECONNREFUSED: true, ECONNRESET: true }
module.exports = createProxy

/**
 * Creates a proxy server that will forward a hostname to a specific address.
 *
 * @params {Function} findAddress - a function that when given a hostname returns a valid address object.
 * @returns {net.Server}
 */
function createProxy (findAddress) {
  if (typeof findAddress !== 'function') {
    throw new TypeError('host resolver must be a function')
  }

  return net.createServer(handleConnection)

  /**
    * Function to handle a new connection.
    * Adds an eventlistener to wait for data.
    *
    * @param {net.Socket|tls.TLSSocket} socket
    */
  function handleConnection (socket) {
    socket
			.once('error', handleError)
			.once('data', handleData)
  }

  /**
    * Function to listen
 for initial request data.
    * Attempts to proxy request based on hostname.
    *
    * @param {Buffer} data
    */
  function handleData (data) {
    var secure = data[0] === 22
    var hostname = secure ? parseSNI(data) : parseHeader(data)
    var address = parseAddress(findAddress(hostname, secure))
    if (address == null) return this.end()
    var proxy = net.connect(address)
    proxy
			.setTimeout(0)
			.once('error', handleError)
			.write(data)
    this
			.setTimeout(0)
			.pipe(proxy)
			.pipe(this)
  }
}

/**
	* Gracefully handle net errors.
	*
	* @param {Error} err
	*/
function handleError (err) {
  if (ignoreErrors[err.code]) return this.end()
  this.destroy(err)
}

/**
 * Parses initial http header for a hostname.
 *
 * @params {Buffer} data
 * @returns {String|null}
 */
function parseHeader (data) {
  var match = data.toString('utf8').match(hostReg)
  return match && match[1]
}

/**
 * Parses initial https SNI data for a hostname.
 *
 * @params {Buffer} data
 * @returns {String|null}
 */
function parseSNI (data) {
   // Session ID Length (static position)
  var currentPos = 43
   // Skip session IDs
  currentPos += 1 + data[currentPos]
   // skip Cipher Suites
  currentPos += 2 + data.readInt16BE(currentPos)
   // skip compression methods
  currentPos += 1 + data[currentPos]
   // We are now at extensions!
  currentPos += 2 // ignore extensions length
  while (currentPos < data.length) {
    if (data.readInt16BE(currentPos) === 0) {
       // we have found an SNI
      var sniLength = data.readInt16BE(currentPos + 2)
      currentPos += 4
       // the RFC says this is a reserved host type, not DNS
      if (data[currentPos] !== 0) return null
      currentPos += 5
      return data.toString('utf8', currentPos, currentPos + sniLength - 5)
    } else {
      currentPos += 4 + data.readInt16BE(currentPos + 2)
    }
  }
  return null
}

/**
 * Converts an href string into a valid socket address.
 *
 * @params {*} address
 * @returns {Object}
 */
function parseAddress (address) {
  if (typeof address !== 'string') return address
  var parsed = url.parse(address)
  return { host: parsed.hostname.replace(wwwReg, ''), port: parsed.port }
}
