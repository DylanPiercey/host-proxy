# HOST-PROXY
Fast, lightweight and transparent http(s) proxy that supports dynamic hostnames.

# Installation

#### Npm
```console
npm install host-proxy
```

# Example

```javascript
var createProxy = require('host-proxy');

// Start a proxy server.
createProxy(function (hostname) {
	// Respond with an address to proxy to.
	// Result is passed to net.createConnection.
	return ({
		"test.com": "http://localhost:3002",
		"secure.test.com": "https://localhost:3002",
		"search.test.com": "http://google.ca",
		"api.test.com": { port: 12346, family: 'IPv4', address: "127.0.0.1" }
	})[hostname];
}).listen(80);
```

### The above example creates the following proxy:

* **test.com** -> http://localhost:3002
* **secure.test.com** -> https://localhost:3002
* **search.test.com** -> http://google.ca
* **api.test.com** -> http://localhost:3003

### Contributions

* Use gulp to run tests.

Please feel free to create a PR!
