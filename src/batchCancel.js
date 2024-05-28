const { z } = require('zod')
const { createResponsePromise } = require('./utils')

const schema = z.object({
  orders: z.string().min(1).array(),
  token: z.string().min(1),
})

module.exports.cancelOrder = function cancelAll(conn, { params, reqId }) {
  schema.parse(params)
  conn.send({ method: 'cancel_order', params, reqId })
  return createResponsePromise(conn, 'cancel_order', reqId)
}
