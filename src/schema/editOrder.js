const {
  triggeredOrderTypes,
  limitOrderTypes,
  marketOrderTypes,
} = require('../constants')
const { ConditionalParamError } = require('../error/index')

module.exports.editOrder = [
  {
    type: 'string',
    name: 'deadline',
    required: false,
    valueType: 'any',
  },
  {
    type: 'float',
    name: 'display_qty',
    required: false,
    condition: ({ params }) => {
      if (params.order_type !== 'iceberg') {
        throw new ConditionalParamError(
          `Param 'display_qty' only works with param 'order_type' of value 'iceberd'. Received order_type '${params.order_type}'`
        )
      }
    },
  },
  {
    type: 'string',
    name: 'fee_preference',
    required: false,
    valueType: 'enum',
    possibleValues: ['base', 'quote'],
  },
  {
    type: 'float',
    name: 'limit_price',
    required: false,
  },
  {
    type: 'boolean',
    name: 'no_mpp',
    required: false,
    condition: ({ params }) => {
      if (!marketOrderTypes.includes(params.order_type)) {
        const worksWith = marketOrderTypes.map((ot) => `'${ot}'`).join(', ')
        throw new ConditionalParamError(
          `Param 'no_mpp' only works with param 'order_type' being one of: ${worksWith}. Received order_type '${params.order_type}'`
        )
      }
    },
  },
  {
    type: 'string',
    name: 'order_id',
    required: true,
    valueType: 'any',
  },
  {
    type: 'float',
    name: 'order_qty',
    required: false,
  },
  {
    type: 'integer',
    name: 'order_userref',
    required: false,
  },
  {
    type: 'boolean',
    name: 'post_only',
    required: false,
    condition: ({ params }) => {
      if (!limitOrderTypes.includes(params.order_type)) {
        const worksWith = limitOrderTypes.map((ot) => `'${ot}'`).join(', ')
        throw new ConditionalParamError(
          `Param 'post_only' only works with param 'order_type' being one of: ${worksWith}. Received order_type '${params.order_type}'`
        )
      }
    },
  },
  {
    type: 'boolean',
    name: 'reduce_only',
    required: false,
  },
  {
    type: 'string',
    name: 'symbol',
    required: true,
    valueType: 'any',
  },
  {
    type: 'object',
    name: 'triggers',
    required: false,
    fields: [
      {
        type: 'string',
        name: 'reference',
        required: false,
        valueType: 'enum',
        possibleValues: ['index', 'last'],
        defaultValue: 'last',
      },
      {
        type: 'float',
        name: 'price',
        required: false,
      },
      {
        type: 'string',
        name: 'price_type',
        required: false,
        valueType: 'enum',
        possibleValues: ['static', 'pct', 'quote'],
        defaultValue: 'static',
      },
    ],
    condition: ({ params }) => {
      if (!triggeredOrderTypes.includes(params.order_type)) {
        const worksWith = triggeredOrderTypes.map((ot) => `'${ot}'`).join(', ')
        throw new ConditionalParamError(
          `Param 'triggers' only works with param 'order_type' being one of: ${worksWith}. Received order_type '${params.order_type}'`
        )
      }
    },
  },
  {
    type: 'boolean',
    name: 'validate',
    required: false,
  },
  {
    type: 'float',
    name: 'price',
    required: false,
  },
  {
    type: 'string',
    name: 'trigger',
    required: false,
    valueType: 'any',
  },
  {
    type: 'float',
    name: 'stop_price',
    required: false,
  },
  {
    type: 'string',
    name: 'token',
    required: true,
    valueType: 'any',
  },
]
