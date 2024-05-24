const get = require('lodash.get')
const {
  triggeredOrderTypes,
  limitOrderTypes,
  marketOrderTypes,
} = require('../constants')
const { isUUIDLong, isUUIDShort } = require('../validators/index')

const batchAdd = [
  {
    type: 'string',
    name: 'deadline',
    required: false,
    valueType: 'any'
  },
  {
    type: 'string',
    name: 'symbol',
    required: true,
    valueType: 'any'
  },
  {
    type: 'boolean',
    name: 'validate',
    required: false
  },
  {
    type: 'string',
    name: 'token',
    required: true,
    valueType: 'any'
  },
  {
    type: 'array of objects',
    name: 'orders',
    required: true,
    fields: [
      {
        type: 'float',
        name: 'cash_order_qty',
        required: false,
        condition: ({ params, parentPath }) => {
          const order = get(params, parentPath)
          if (!marketOrderTypes.includes(order.order_type)) {
            const worksWith = marketOrderTypes.map(ot => `'${ot}'`).join(', ')
            throw new ConditionalParamError(`Param '${parentPath}.cash_order_qty' only works with param '${parentPath}.order_type' being one of: ${worksWith}. Received order_type '${order.order_type}'`)
          }
        },
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
              'trailing-stop-limit'
            ]
          },
          {
            type: 'float',
            name: 'limit_price',
            required: false
          },
          {
            type: 'string',
            name: 'limit_price_type',
            required: false,
            valueType: 'enum',
            possibleValues: [
              'static',
              'pct',
              'quote'
            ],
            defaultValue: 'quote',
            condition: ({ params, parentPath }) => {
              const order = get(params, parentPath)
              if (order.order_type !== 'trailing-stop-limit') {
                throw new ConditionalParamError(
                  `Param '${parentPath}.limit_price_type' only works with param '${parentPath}.order_type' of value 'trailing-stop-limit'. Received order_type '${order.order_type}'`
                )
              }
            },
          },
          {
            type: 'float',
            name: 'trigger_price',
            required: false
          },
          {
            type: 'string',
            name: 'trigger_price_type',
            required: false,
            valueType: 'enum',
            possibleValues: [
              'static',
              'pct',
              'quote'
            ],
            defaultValue: 'static'
          },
          {
            type: 'float',
            name: 'stop_price',
            required: false
          }
        ]
      },
      {
        type: 'float',
        name: 'display_qty',
        required: false,
        condition: ({ params, parentPath }) => {
          const order = get(params, parentPath)
          if (order.order_type !== 'iceberg') {
            throw new ConditionalParamError(`Param '${parentPath}.display_qty' only works with param '${parentPath}.order_type' of value 'iceberd'. Received order_type '${order.order_type}'`)
          }
        },
      },
      {
        type: 'string',
        name: 'effective_time',
        required: false,
        valueType: 'any'
      },
      {
        type: 'string',
        name: 'expire_time',
        required: false,
        valueType: 'any',
        condition: ({ params, parentPath }) => {
          const order = get(params, parentPath)
          if (order.time_in_force !== 'gtd') {
            throw new ConditionalParamError(`Param '${parentPath}.expire_time' only works with param '${parentPath}.time_in_force' being one of: 'gtd'. Received time_in_force '${order.time_in_force}'`)
          }
        },
      },
      {
        type: 'string',
        name: 'fee_preference',
        required: false,
        valueType: 'enum',
        possibleValues: [
          'base',
          'quote'
        ]
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
        possibleValues: [
          'static',
          'pct',
          'quote'
        ],
        defaultValue: 'quote',
        condition: ({ params, parentPath }) => {
          const order = get(params, parentPath)
          if (order.order_type !== 'trailing-stop-limit') {
            throw new ConditionalParamError(
              `Param '${parentPath}.limit_price_type' only works with param '${parentPath}.order_type' of value 'trailing-stop-limit'. Received order_type '${order.order_type}'`
            )
          }
        },
      },
      {
        type: 'boolean',
        name: 'margin',
        required: false
      },
      {
        type: 'boolean',
        name: 'no_mpp',
        required: false,
        condition: ({ params }) => {
          const order = get(params, parentPath)
          if (!marketOrderTypes.includes(params.order_type)) {
            const worksWith = marketOrderTypes.map(ot => `'${ot}'`).join(', ')
            throw new ConditionalParamError(`Param '${parentPath}.no_mpp' only works with param '${parentPath}.order_type' being one of: ${worksWith}. Received order_type '${order.order_type}'`)
          }
        },
      },
      {
        type: 'string',
        name: 'cl_ord_id',
        required: false,
        valueType: 'any'
      },
      {
        type: 'integer',
        name: 'order_userref',
        required: false
      },
      {
        type: 'float',
        name: 'order_qty',
        required: true
      },
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
          'settle-position'
        ]
      },
      {
        type: 'boolean',
        name: 'post_only',
        required: false,
        condition: ({ params, parentPath }) => {
          const order = get(params, parentPath)
          if (!limitOrderTypes.includes(order.order_type)) {
            const worksWith = limitOrderTypes.map(ot => `'${ot}'`).join(', ')
            throw new ConditionalParamError(`Param '${parentPath}.post_only' only works with param '${parentPath}.order_type' being one of: ${worksWith}. Received order_type '${order.order_type}'`)
          }
        },
      },
      {
        type: 'boolean',
        name: 'reduce_only',
        required: false
      },
      {
        type: 'string',
        name: 'side',
        required: true,
        valueType: 'enum',
        possibleValues: [
          'buy',
          'sell'
        ]
      },
      {
        type: 'string',
        name: 'stp_type',
        required: false,
        valueType: 'enum',
        possibleValues: [
          'cancel_newest',
          'cancel_oldest',
          'cancel_both'
        ],
        defaultValue: 'cancel_newest'
      },
      {
        type: 'string',
        name: 'time_in_force',
        required: false,
        valueType: 'enum',
        possibleValues: [
          'gtc',
          'gtd',
          'ioc'
        ],
        defaultValue: 'gtc'
      },
      {
        type: 'object',
        name: 'triggers',
        required: true,
        fields: [
          {
            type: 'string',
            name: 'reference',
            required: false,
            valueType: 'enum',
            possibleValues: [
              'index',
              'last'
            ],
            defaultValue: 'last'
          },
          {
            type: 'float',
            name: 'price',
            required: true
          },
          {
            type: 'string',
            name: 'price_type',
            required: false,
            valueType: 'enum',
            possibleValues: [
              'static',
              'pct',
              'quote'
            ],
            defaultValue: 'static'
          }
        ],
        condition: ({ params, parentPath }) => {
          const order = get(params, parentPath)
          if (!triggeredOrderTypes.includes(order.order_type)) {
            const worksWith = triggeredOrderTypes.map(ot => `'${ot}'`).join(', ')
            throw new ConditionalParamError(`Param '${parentPath}.triggers' only works with param '${parentPath}.order_type' being one of: ${worksWith}. Received order_type '${order.order_type}'`)
          }
        },
      },
      {
        type: 'string',
        name: 'sender_sub_id',
        required: false,
        valueType: 'any',
        format: (value) => (
          isUUIDLong(value)
          || isUUIDShort(value)
          || value.match(/^[a-zA-Z0-9]{1,18}^/)
        ),
      },
      {
        type: 'float',
        name: 'stop_price',
        required: false
      },
      {
        type: 'string',
        name: 'trigger',
        required: false,
        valueType: 'enum',
        possibleValues: [
          'last',
          'index'
        ],
        defaultValue: 'last'
      }
    ]
  },
  {
    type: 'string',
    name: 'token',
    required: true,
    valueType: 'any'
  }
]
