import { createEmitSubscriptionStatusSuccess } from './utils/createEmitSubscriptionStatusSuccess'

export const createEmitSubscriptionStatusOpenOrdersSuccess = data => {
  if (!data.pair) throw new Error('Needs pair')

  const emitData = {
    channelName: 'trade',
    subscription: { name: 'openOrders' },
  }

  if (typeof data.reqid !== 'undefined') {
    emitData.reqid = data.reqid
  }

  return createEmitSubscriptionStatusSuccess(emitData)
}
