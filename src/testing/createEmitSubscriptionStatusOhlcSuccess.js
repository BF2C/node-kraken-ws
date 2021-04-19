import { createEmitSubscriptionStatusSuccess } from './utils/createEmitSubscriptionStatusSuccess'

export const createEmitSubscriptionStatusOhlcSuccess = data => {
  if (typeof data.channelID === 'undefined') throw new Error('Needs channelID')
  if (!data.pair) throw new Error('Needs pair')
  if (!data.interval) throw new Error('Needs interval')

  const emitData = {
    channelID: data.channelID,
    channelName: 'ohlc',
    pair: data.pair,
    subscription: {
      name: 'ohlc',
      interval: data.interval,
    },
  }

  if (typeof data.reqid !== 'undefined') {
    emitData.reqid = data.reqid
  }

  return createEmitSubscriptionStatusSuccess(emitData)
}
