import { createEmitSubscriptionEventPublic } from './utils/createEmitSubscriptionEventPublic'

export const createEmitSubscriptionEventSpread = data => {
  if (!data.data.bid) throw new Error('data needs "bid"')
  if (typeof data.data.bid !== 'string') throw new Error('data.bid needs to be a string')
  if (!data.data.ask) throw new Error('data needs "ask"')
  if (typeof data.data.ask !== 'string') throw new Error('data.ask needs to be a string')
  if (!data.data.timestamp) throw new Error('data needs "timestamp"')
  if (typeof data.data.timestamp !== 'string') throw new Error('data.timestamp needs to be a string')
  if (!data.data.bidVolume) throw new Error('data needs "bidVolume"')
  if (typeof data.data.bidVolume !== 'string') throw new Error('data.bidVolume needs to be a string')
  if (!data.data.askVolume) throw new Error('data needs "askVolume"')
  if (typeof data.data.askVolume !== 'string') throw new Error('data.askVolume needs to be a string')

  return createEmitSubscriptionEventPublic({
    ...data,
    channelName: 'spread',
    data: [
      data.data.bid,
      data.data.ask,
      data.data.timestamp,
      data.data.bidVolume,
      data.data.askVolume,
    ]
  })
}
