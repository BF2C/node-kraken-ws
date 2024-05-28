const { connect } = require('./connect')
const { addOrder } = require('./addOrder')
const { editOrder } = require('./editOrder')
const { cancelOrder } = require('./cancelOrder')
const { cancelAll } = require('./cancelAll')
const { cancelOnDisconnect } = require('./cancelOnDisconnect')
const { batchAdd } = require('./batchAdd')
const { batchCancel } = require('./batchCancel')
const { executions } = require('./executions')
const { balances } = require('./balances')
const { ticker } = require('./ticker')
const { book } = require('./book')
const { orders } = require('./orders')
const { candles } = require('./candles')
const { trades } = require('./trades')
const { instruments } = require('./instruments')
const { status } = require('./status')
const { heartbeat } = require('./heartbeat')
const { ping } = require('./ping')

module.exports = {
  connect,
  addOrder,
  editOrder,
  cancelOrder,
  cancelAll,
  cancelOnDisconnect,
  batchAdd,
  batchCancel,
  executions,
  balances,
  ticker,
  book,
  orders,
  candles,
  trades,
  instruments,
  status,
  heartbeat,
  ping,
}
