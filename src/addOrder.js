const { z } = require('zod')
const {
  applyVariations,
  createResponsePromise,
  ID_PARAMETER,
  RFC3339,
} = require('./utils')

// @TODO:
// If I understand the docs correctly, then the "order_type" is optional.
// I suppose this means that the order_type will be the same as the primary order's order_type.
// That makes creating the zod schema much more complex, therefore I decided that it's easier
// to just make the order_type required.
// This should be changed at some point!
const conditional = z.discriminatedUnion('order_type', [
  z.object({
    order_type: z.literal('limit'),
    limit_price: z.number().optional(),
  }),
  z.object({
    order_type: z.literal('stop-loss'),
    cash_order_qty: z.number().optional(),
    trigger_price: z.number().optional(),
    trigger_price_type: z.enum(['static', 'pct', 'quote']).optional(),
  }),
  z.object({
    order_type: z.literal('stop-loss-limit'),
    limit_price: z.number().optional(),
  }),
  z.object({
    order_type: z.literal('take-profit'),
    cash_order_qty: z.number().optional(),
    trigger_price: z.number().optional(),
    trigger_price_type: z.enum(['static', 'pct', 'quote']).optional(),
  }),
  z.object({
    order_type: z.literal('take-profit-limit'),
    limit_price: z.number().optional(),
  }),
  z.object({
    order_type: z.literal('trailing-stop'),
    cash_order_qty: z.number().optional(),
    trigger_price: z.number().optional(),
    trigger_price_type: z.enum(['static', 'pct', 'quote']).optional(),
  }),
  z.object({
    order_type: z.literal('trailing-stop-limit'),
    limit_price: z.number().optional(),
    limit_price_type: z.enum(['static', 'pct', 'quote']).optional(),
  }),
])

const generalParams = {
  side: z.enum(['buy', 'sell']),
  order_qty: z.number(),
  order_type: z.number(),
  symbol: z.string().min(1),
  reduce_only: z.boolean().optional(),
  effective_time: z.string().regex(RFC3339).optional(),
  deadline: z.string().regex(RFC3339).optional(),
  cl_ord_id: z.string().regex(ID_PARAMETER).optional(),
  order_userref: z.number().int().optional(),
  fee_preference: z.enum(['base', 'quote']).optional(),
  stp_type: z
    .enum(['cancel_newest', 'cancel_oldest', 'cancel_both'])
    .optional(),
  validate: z.boolean().optional(),
  sender_sub_id: z.string().regex(RFC3339).optional(),
  conditional: conditional.optional(),
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
      price: z.number().optional(),
      reference: z.enum(['index', 'last']).optional(),
      price_type: z.enum(['static', 'pct', 'quote']).optional(),
    }),
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

const limitOrders = applyAddOrderVariations(
  { order_type: z.literal('limit') },
  limitOrdersVariations
)

const marketOrders = applyAddOrderVariations(
  { order_type: z.literal('market') },
  marketOrdersVariations
)

const icebergOrders = applyAddOrderVariations({
  order_type: z.literal('iceberg'),
  display_qty: z.number().optional(),
})

const stopLossOrders = applyAddOrderVariations(
  { order_type: z.literal('stop-loss') },
  triggerOrdersVariations,
  marketOrdersVariations
)

const stopLossLimitOrders = applyAddOrderVariations(
  { order_type: z.literal('stop-loss-limit') },
  triggerOrdersVariations,
  limitOrdersVariations
)

const takeProfitOrders = applyAddOrderVariations(
  { order_type: z.literal('take-profit') },
  triggerOrdersVariations,
  marketOrdersVariations
)

const takeProfitLimitOrders = applyAddOrderVariations(
  { order_type: z.literal('take-profit-limit') },
  triggerOrdersVariations,
  limitOrdersVariations
)

const trailingStopOrders = applyAddOrderVariations(
  { order_type: z.literal('trailing-stop') },
  triggerOrdersVariations,
  marketOrdersVariations
)

const trailingStopLimitOrders = applyAddOrderVariations(
  {
    order_type: z.literal('trailing-stop-limit'),
    limit_price_type: z.enum(['static', 'pct', 'quote']).optional(),
  },
  triggerOrdersVariations,
  limitOrdersVariations
)

const settlePositionOrders = applyAddOrderVariations({
  order_type: z.literal('settle-position'),
  display_qty: z.number().optional(),
})

const addOrderParams = [
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
]
module.exports.addOrderParams = addOrderParams

// let logged = false
// const schemaToNames = curSchema =>
//   Object
//   	.entries(curSchema)
//   	.map(([key, config]) => {
//     	if (!config || !config._def) console.log('> no config:', key)

//     	if (config.typeName === 'ZodOptional') {
//       	return { [key]: config.innerType._def.typeName, required: false }
//     	}

//     	if (!config._def) {
//       	{ [key]: config, required: true }
//     	}

//     	if (config._def?.typeName === 'ZodLiteral') {
//       	return { [key]: config._def.value, required: true }
//     	}

//     	if (config._def?.typeName === 'ZodEnum') {
//       	return { [key]: config._def.values, required: true }
//     	}

//     	if (config._def?.typeName === 'ZodOptional') {
//       	return { [key]: config._def.innerType._def.typeName, required: false }
//     	}

//     	if (config._def?.typeName === 'ZodString') {
//       	return { [key]: 'string', required: true }
//     	}

//     	if (config._def?.typeName === 'ZodNumber') {
//       	return { [key]: 'number', required: true }
//     	}

//     	return { [key]: config, required: true }
//   	})

// const tmp = addOrderParams.slice(0, 1).map(schemaToNames)[0]

const schema = z.union(addOrderParams.map(z.object))

module.exports.addOrder = function addOrder(conn, { params, reqId }) {
  schema.parse(params)
  conn.send({ method: 'add_order', params, reqId })
  return createResponsePromise(conn, 'add_order', reqId)
}
