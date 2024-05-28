const { z } = require('zod')

const schema = z.object({
  symbol: z.string().min(1),
  depth: z.enum([10, 100, 1000]).optional(),
  snapshot: z.boolean().optional(),
  token: z.string().min(1),
})

module.exports.orders = function orders(conn, { params, reqId }) {
  schema.parse(params)
  conn.send({
    method: 'subscribe',
    params: { ...params, channel: 'orders' },
    reqId,
  })
}
