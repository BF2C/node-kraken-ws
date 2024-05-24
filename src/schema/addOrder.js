const {
  triggeredOrderTypes,
  limitOrderTypes,
  marketOrderTypes,
} = require('../constants')
const { ConditionalParamError } = require('../error/index')
const { isUUIDLong, isUUIDShort, isRFC3339 } = require('../validators/index')

module.exports.addOrder = [
  {
    type: 'string',
    name: 'order_type',
    required: true,
    valueType: 'enum',
    possibleValues: [
      'limit',
      'market',
      'iceberg',
      'stop-loss',
      'stop-loss-limit',
      'take-profit',
      'take-profit-limit',
      'trailing-stop',
      'trailing-stop-limit',
      'settle-position',
    ],
  },
  {
    type: 'string',
    name: 'side',
    required: true,
    valueType: 'enum',
    possibleValues: ['buy', 'sell'],
  },
  {
    type: 'float',
    name: 'order_qty',
    required: true,
  },
  {
    type: 'string',
    name: 'symbol',
    required: true,
    valueType: 'any',
  },
  {
    type: 'float',
    name: 'limit_price',
    required: false,
  },
  {
    type: 'string',
    name: 'limit_price_type',
    required: false,
    valueType: 'enum',
    possibleValues: ['static', 'pct', 'quote'],
    defaultValue: 'quote',
    condition: ({ params }) => {
      if (params.order_type !== 'trailing-stop-limit') {
        throw new ConditionalParamError(
          `Param 'limit_price_type' only works with param 'order_type' of value 'trailing-stop-limit'. Received order_type '${params.order_type}'`
        )
      }
    },
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
        required: true,
      },
      {
        type: 'string',
        name: 'reference',
        required: false,
        valueType: 'enum',
        possibleValues: ['static', 'pct', 'quote'],
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
    type: 'string',
    name: 'time_in_force',
    required: false,
    valueType: 'enum',
    possibleValues: ['gtc', 'gtd', 'ioc'],
    defaultValue: 'gtc',
  },
  {
    type: 'boolean',
    name: 'margin',
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
    name: 'effective_time',
    required: false,
    valueType: 'any',
    format: (value) => {
      if (!isRFC3339(value)) {
        throw new Error(`Param 'effective_time' must be of format RFC3339`)
      }
    },
  },
  {
    type: 'string',
    name: 'expire_time',
    required: false,
    valueType: 'any',
    format: (value) => {
      if (!isRFC3339(value)) {
        throw new Error(`Param 'expire_time' must be of format RFC3339`)
      }
    },
    condition: ({ params }) => {
      if (params.time_in_force !== 'gtd') {
        throw new ConditionalParamError(
          `Param 'expire_time' only works with param 'time_in_force' being one of: 'gtd'. Received time_in_force '${params.time_in_force}'`
        )
      }
    },
  },
  {
    type: 'string',
    name: 'deadline',
    required: false,
    valueType: 'any',
    format: (value) => {
      if (!isRFC3339(value)) {
        throw new Error(`Param 'deadline' must be of format RFC3339`)
      }
    },
  },
  {
    type: 'string',
    name: 'cl_ord_id',
    required: false,
    valueType: 'any',
    format: (value) =>
      isUUIDLong(value) ||
      isUUIDShort(value) ||
      value.match(/^[a-zA-Z0-9]{1,18}^/),
  },
  {
    type: 'integer',
    name: 'order_userref',
    required: false,
  },
  {
    type: 'object',
    name: 'conditional',
    required: false,
    fields: [
      {
        type: 'string',
        name: 'order_type',
        required: false,
        valueType: 'enum',
        possibleValues: [
          'limit',
          'stop-loss',
          'stop-loss-limit',
          'take-profit',
          'take-profit-limit',
          'trailing-stop',
          'trailing-stop-limit',
        ],
      },
      {
        type: 'float',
        name: 'limit_price',
        required: false,
      },
      {
        type: 'string',
        name: 'limit_price_type',
        required: false,
        valueType: 'enum',
        possibleValues: ['static', 'pct', 'quote'],
        defaultValue: 'quote',
        condition: ({ params }) => {
          if (params.conditional.order_type !== 'trailing-stop-limit') {
            throw new ConditionalParamError(
              `Param 'conditional.limit_price_type' only works with param 'conditional.order_type' of value 'trailing-stop-limit'. Received order_type '${params.conditional.order_type}'`
            )
          }
        },
      },
      {
        type: 'float',
        name: 'trigger_price',
        required: false,
      },
      {
        type: 'string',
        name: 'trigger_price_type',
        required: false,
        valueType: 'enum',
        possibleValues: ['static', 'pct', 'quote'],
        defaultValue: 'static',
      },
      {
        type: 'float',
        name: 'stop_price',
        required: false,
      },
    ],
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
    name: 'stp_type',
    required: false,
    valueType: 'enum',
    possibleValues: ['cancel_newest', 'cancel_oldest', 'cancel_both'],
    defaultValue: 'cancel_newest',
  },
  {
    type: 'float',
    name: 'cash_order_qty',
    required: false,
    condition: ({ params }) => {
      if (params.margin) {
        throw new ConditionalParamError(
          `Param 'cash_order_qty' only works with param 'margin' of value 'false' (default). Received margin '${params.margin}'`
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
    type: 'string',
    name: 'sender_sub_id',
    required: false,
    valueType: 'any',
    format: (value) =>
      isUUIDLong(value) ||
      isUUIDShort(value) ||
      value.match(/^[a-zA-Z0-9]{1,18}^/),
  },
  {
    type: 'float',
    name: 'stop_price',
    required: false,
  },
  {
    type: 'string',
    name: 'trigger',
    required: false,
    valueType: 'enum',
    possibleValues: ['last', 'index'],
    defaultValue: 'last',
  },
  {
    type: 'string',
    name: 'token',
    required: true,
    valueType: 'any',
  },
]
