import { createEmitSubscriptionStatusSuccess } from './utils/createEmitSubscriptionStatusSuccess'

export const createEmitSubscriptionStatusOpenOrdersSuccess = data => {
  const emitData = {
    channelName: 'openOrders',
    subscription: { name: 'openOrders' },
  }

  if (typeof data.reqid !== 'undefined') {
    emitData.reqid = data.reqid
  }

  return createEmitSubscriptionStatusSuccess(emitData)
}
