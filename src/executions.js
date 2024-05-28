const { z } = require('zod')

const schema = z.object({
  snapshot_trades: z.boolean().optional(),
  order_status: z.boolean().optional(),
  ratecounter: z.boolean().optional(),
  snapshot: z.boolean().optional(),
  token: z.string().min(1),
})

module.exports.executions = function executions(conn, { params, reqId }) {
  schema.parse(params)
  conn.send({
    method: 'subscribe',
    params: { ...params, channel: 'executions' },
    reqId,
  })
}
