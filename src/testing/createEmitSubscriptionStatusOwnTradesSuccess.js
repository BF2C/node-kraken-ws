import { createEmitSubscriptionStatusSuccess } from './utils/createEmitSubscriptionStatusSuccess'

export const createEmitSubscriptionStatusOwnTradesSuccess = data => {
  if (!data.pair) throw new Error('Needs pair')

  const emitData = {
    channelName: 'trade',
    subscription: { name: 'ownTrades' },
  }

  if (typeof data.reqid !== 'undefined') {
    emitData.reqid = data.reqid
  }

  return createEmitSubscriptionStatusSuccess(emitData)
}
