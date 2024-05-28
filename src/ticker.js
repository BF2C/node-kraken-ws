const { z } = require('zod')

const schema = z.object({
  symbol: z.string().min(1),
  event_trigger: z.enum(['bbo', 'trades']).optional(),
  snapshot: z.boolean().optional(),
})

module.exports.balances = function balances(conn, { params, reqId }) {
  schema.parse(params)
  conn.send({
    method: 'subscribe',
    params: { ...params, channel: 'balances' },
    reqId,
  })
}
