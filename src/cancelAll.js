const { z } = require('zod')
const { createResponsePromise } = require('./utils')

const schema = z.object({ token: z.string().min(1) })

module.exports.cancelAll = function cancelAll(conn, { params, reqId }) {
  schema.parse(params)
  conn.send({ method: 'cancel_all', params, reqId })
  return createResponsePromise(conn, 'cancel_all', reqId)
}

module.exports.cancelAll = [
  {
    type: 'string',
    name: 'token',
    required: true,
    valueType: 'any',
  },
]
