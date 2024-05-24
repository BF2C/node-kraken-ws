const orderTypes = [
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
]
module.exports.orderTypes = orderTypes

const triggeredOrderTypes = [
  'stop-loss',
  'stop-loss-limit',
  'take-profit',
  'take-profit-limit',
  'trailing-stop',
  'trailing-stop-limit',
]
module.exports.triggeredOrderTypes = triggeredOrderTypes

const limitOrderTypes = [
  'limit',
  'stop-loss-limit',
  'take-profit-limit',
  'trailing-stop-limit',
]
module.exports.limitOrderTypes = limitOrderTypes

const marketOrderTypes = [
  'market',
  'stop-loss',
  'take-profit',
  'trailing-stop',
]
module.exports.marketOrderTypes = marketOrderTypes

const sides = ['buy', 'sell']
module.exports.sides = sides

const limitPriceTypes = ['static', 'pct', 'quote']
module.exports.limitPriceTypes = limitPriceTypes
