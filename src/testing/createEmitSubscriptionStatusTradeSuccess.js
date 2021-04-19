import { createEmitSubscriptionStatusSuccess } from './utils/createEmitSubscriptionStatusSuccess'

export const createEmitSubscriptionStatusTradeSuccess = data => {
  if (typeof data.channelID === 'undefined') throw new Error('Needs channelID')
  if (!data.pair) throw new Error('Needs pair')

  const emitData = {
    channelID: data.channelID,
    channelName: 'trade',
    pair: data.pair,
    subscription: { name: 'trade' },
  }

  if (typeof data.reqid !== 'undefined') {
    emitData.reqid = data.reqid
  }

  return createEmitSubscriptionStatusSuccess(emitData)
}
