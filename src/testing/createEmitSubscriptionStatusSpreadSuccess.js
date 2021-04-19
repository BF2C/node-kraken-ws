import { createEmitSubscriptionStatusSuccess } from './utils/createEmitSubscriptionStatusSuccess'

export const createEmitSubscriptionStatusSpreadSuccess = data => {
  if (typeof data.channelID === 'undefined') throw new Error('Needs channelID')
  if (!data.pair) throw new Error('Needs pair')

  const emitData = {
    channelID: data.channelID,
    channelName: 'spread',
    pair: data.pair,
    subscription: { name: 'spread' },
  }

  if (typeof data.reqid !== 'undefined') {
    emitData.reqid = data.reqid
  }

  return createEmitSubscriptionStatusSuccess(emitData)
}
