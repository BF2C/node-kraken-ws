module.exports.cancelOrder = [
  {
    type: 'array of string',
    name: 'order_id',
    required: false,
  },
  {
    type: 'array of string',
    name: 'cl_ord_id',
    required: false,
  },
  {
    type: 'array of integer',
    name: 'order_userref',
    required: false,
  },
  {
    type: 'string',
    name: 'token',
    required: true,
    valueType: 'any',
  },
]
