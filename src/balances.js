const { z } = require('zod')

const schema = z.object({
  snapshot: z.boolean().optional(),
  token: z.string().min(1),
})

module.exports.balances = function balances(conn, { params, reqId }) {
  schema.parse(params)
  conn.send({
    method: 'subscribe',
    params: { ...params, channel: 'balances' },
    reqId,
  })
}
