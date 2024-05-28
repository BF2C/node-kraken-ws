const { z } = require('zod')

const schema = z.object({
  symbol: z.string().min(1),
  interval: z.enum([1, 5, 15, 30, 60, 240, 1440, 10080, 21600]).optional(),
  snapshot: z.boolean().optional(),
})

module.exports.orders = function orders(conn, { params, reqId }) {
  schema.parse(params)
  conn.send({
    method: 'subscribe',
    params: { ...params, channel: 'orders' },
    reqId,
  })
}
