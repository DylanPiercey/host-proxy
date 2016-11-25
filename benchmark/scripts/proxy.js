var createProxy = require('../../')
createProxy(function (hostname) {
  if (hostname !== 'localhost') return
  return {
    port: 9000,
    address: 'localhost'
  }
}).listen(8000)
