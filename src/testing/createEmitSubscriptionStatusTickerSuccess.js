import { createEmitSubscriptionStatusSuccess } from './utils/createEmitSubscriptionStatusSuccess'

export const createEmitSubscriptionStatusTickerSuccess = data => {
  if (typeof data.channelID === 'undefined') throw new Error('Needs channelID')
  if (!data.pair) throw new Error('Needs pair')

  const emitData = {
    channelID: data.channelID,
    channelName: 'ticker',
    pair: data.pair,
    subscription: { name: 'ticker' },
  }

  if (typeof data.reqid !== 'undefined') {
    emitData.reqid = data.reqid
  }

  return createEmitSubscriptionStatusSuccess(emitData)
}
