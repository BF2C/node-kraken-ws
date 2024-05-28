const { z } = require('zod')
const { applyVariations, createResponsePromise, RFC3339 } = require('./utils')

const generalParams = {
  deadline: z.string().optional(),
  fee_preference: z.enum(['base', 'quote']).optional(),
  order_id: z.string().min(1),
  order_qty: z.number(),
  order_userref: z.string().optional(),
  reduce_only: z.boolean().optional(),
  symbol: z.string().min(1),
  validate: z.boolean().optional(),
  token: z.string().min(1),
}

const generalTimeInForceVariations = [
  {
    time_in_force: z.literal('gtd').optional(),
    expire_time: z.string().regex(RFC3339).optional(),
  },
  {
    time_in_force: z.enum(['gtc', 'ioc']).optional(),
  },
]

const generalMarginVariations = [
  { margin: z.boolean().optional() },
  { cash_order_qty: z.number().optional() },
]

const marketOrdersVariations = [{ no_mpp: z.boolean().optional() }]

const limitOrdersVariations = [
  {
    limit_price: z.number(),
    post_only: z.boolean().optional(),
  },
]

const triggerOrdersVariations = [
  {
    triggers: z.object({
      price: z.number(),
      reference: z.enum(['index', 'last']).optional(),
      price_type: z.enum(['static', 'pct', 'quote']).optional(),
    }),
    stop_price: z.number().optional(),
    trigger: z.enum(['last', 'index']).optional(),
  },
]

const applyAddOrderVariations = (config, ...variations) => {
  return applyVariations(
    { ...generalParams, ...config },
    generalMarginVariations,
    generalTimeInForceVariations,
    ...variations
  )
}

const limitOrders = applyAddOrderVariations({}, limitOrdersVariations)

const marketOrders = applyVariations({}, marketOrdersVariations)

const icebergOrders = applyVariations({
  display_qty: z.number().optional(),
})

const stopLossOrders = applyVariations(
  {},
  triggerOrdersVariations,
  marketOrdersVariations
)

const stopLossLimitOrders = applyVariations(
  {},
  triggerOrdersVariations,
  limitOrdersVariations
)

const takeProfitOrders = applyVariations(
  {},
  triggerOrdersVariations,
  marketOrdersVariations
)

const takeProfitLimitOrders = applyVariations(
  {},
  triggerOrdersVariations,
  limitOrdersVariations
)

const trailingStopOrders = applyVariations(
  {},
  triggerOrdersVariations,
  marketOrdersVariations
)

const trailingStopLimitOrders = applyVariations(
  { limit_price_type: z.enum(['static', 'pct', 'quote']).optional() },
  triggerOrdersVariations,
  limitOrdersVariations
)

const settlePositionOrders = applyVariations({
  display_qty: z.number().optional(),
})

const editOrderParamsSchema = z.union([
  ...limitOrders,
  ...marketOrders,
  ...icebergOrders,
  ...stopLossOrders,
  ...stopLossLimitOrders,
  ...takeProfitOrders,
  ...takeProfitLimitOrders,
  ...trailingStopOrders,
  ...trailingStopLimitOrders,
  ...settlePositionOrders,
])

module.exports.addOrder = function editOrder(conn, { params, reqId }) {
  editOrderParamsSchema.parse(params)
  conn.send({ method: 'edit_order', params, reqId })
  return createResponsePromise(conn, 'edit_order', reqId)
}
