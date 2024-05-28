const { z } = require('zod')
const { applyVariations, createResponsePromise } = require('./utils')

const generalSchema = { token: z.string().min(1) }
const idVariations = [
  {
    order_id: z.string().min(1).array().nonempty(),
    cl_ord_id: z.string().min(1).array().optional(),
    order_userref: z.number().int().array().optional(),
  },
  {
    order_id: z.string().min(1).array().optional(),
    cl_ord_id: z.string().min(1).array().nonempty(),
    order_userref: z.number().int().array().optional(),
  },
  {
    order_id: z.string().min(1).array().optional(),
    cl_ord_id: z.string().min(1).array().optional(),
    order_userref: z.number().int().array().nonempty(),
  },
]

const schema = applyVariations(generalSchema, idVariations)

module.exports.cancelOrder = function cancelAll(conn, { params, reqId }) {
  schema.parse(params)
  conn.send({ method: 'cancel_order', params, reqId })
  return createResponsePromise(conn, 'cancel_order', reqId)
}
