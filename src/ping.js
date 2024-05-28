const { z } = require('zod')
const { createResponsePromise } = require('./utils')

module.exports.cancelOrder = function cancelAll(conn, { reqId }) {
  conn.send({ method: 'ping', reqId })
  return createResponsePromise(conn, 'pong', reqId)
}
