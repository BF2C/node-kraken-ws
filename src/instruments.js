const { z } = require('zod')

const schema = z.object({ snapshot: z.boolean().optional() })

module.exports.instruments = function instruments(conn, { params, reqId }) {
  schema.parse(params)
  conn.send({
    method: 'subscribe',
    params: { ...params, channel: 'instruments' },
    reqId,
  })
}
