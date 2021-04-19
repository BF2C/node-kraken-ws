import { createEmitSubscriptionStatusSuccess } from './utils/createEmitSubscriptionStatusSuccess'

export const createEmitSubscriptionStatusBookSuccess = data => {
  if (typeof data.channelID === 'undefined') throw new Error('Needs channelID')
  if (!data.pair) throw new Error('Needs pair')

  const subscription = { name: 'spread' }

  if (data.depth) {
    subscription.depth = data.depth
  }

  const emitData = {
    channelName: 'book',
    channelID: data.channelID,
    pair: data.pair,
    subscription,
  }

  if (typeof data.reqid !== 'undefined') {
    emitData.reqid = data.reqid
  }

  return createEmitSubscriptionStatusSuccess(emitData)
}
