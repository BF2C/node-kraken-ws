const { z } = require('zod')

const schema = z.object({
  symbol: z.string().min(1),
  snapshot: z.boolean().optional(),
})

module.exports.trades = function trades(conn, { params, reqId }) {
  schema.parse(params)
  conn.send({
    method: 'subscribe',
    params: { ...params, channel: 'trades' },
    reqId,
  })
}
