module.exports.batchCancel = [
  {
    type: 'array of string',
    name: 'orders',
    required: true
  },
  {
    type: 'string',
    name: 'token',
    required: true,
    valueType: 'any'
  }
]
