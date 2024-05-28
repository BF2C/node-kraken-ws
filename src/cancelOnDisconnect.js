const { z } = require('zod')
const { createResponsePromise } = require('./utils')

const schema = {
  timeout: z.number().int(),
  token: z.string().min(1),
}

module.exports.cancelOnDisconnect = function cancelOnDisconnect(
  conn,
  { params, reqId }
) {
  schema.parse(params)
  conn.send({ method: 'cancel_all_orders_after', params, reqId })
  return createResponsePromise(conn, 'cancel_all_orders_after', reqId)
}

module.exports.cancelOnDisconnect = [
  {
    type: 'integer',
    name: 'timeout',
    required: true,
  },
  {
    type: 'string',
    name: 'token',
    required: true,
    valueType: 'any',
  },
]
