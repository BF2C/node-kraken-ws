const { z } = require('zod')

const schema = z.object({
  symbol: z.string().min(1),
  depth: z.enum([10, 25, 100, 500, 1000]).optional(),
  snapshot: z.boolean().optional(),
})

module.exports.book = function book(conn, { params, reqId }) {
  schema.parse(params)
  conn.send({
    method: 'subscribe',
    params: { ...params, channel: 'book' },
    reqId,
  })
}
