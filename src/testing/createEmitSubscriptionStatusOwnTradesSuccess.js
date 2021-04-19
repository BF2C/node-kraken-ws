import { createEmitSubscriptionStatusSuccess } from './utils/createEmitSubscriptionStatusSuccess'

export const createEmitSubscriptionStatusOwnTradesSuccess = data => {
  const emitData = {
    channelName: 'trade',
    subscription: { name: 'ownTrades' },
  }

  if (typeof data.reqid !== 'undefined') {
    emitData.reqid = data.reqid
  }

  return createEmitSubscriptionStatusSuccess(emitData)
}
