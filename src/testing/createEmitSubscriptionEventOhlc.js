import { createEmitSubscriptionEventPublic } from './utils/createEmitSubscriptionEventPublic'

export const createEmitSubscriptionEventOhlc = data => {
  if (!data.data.time) throw new Error('data needs "time"')
  if (typeof data.data.time !== 'string')
    throw new Error('data.time needs to be a string')
  if (!data.data.etime) throw new Error('data needs "etime"')
  if (typeof data.data.etime !== 'string')
    throw new Error('data.etime needs to be a string')
  if (!data.data.open) throw new Error('data needs "open"')
  if (typeof data.data.open !== 'string')
    throw new Error('data.open needs to be a string')
  if (!data.data.high) throw new Error('data needs "high"')
  if (typeof data.data.high !== 'string')
    throw new Error('data.high needs to be a string')
  if (!data.data.low) throw new Error('data needs "low"')
  if (typeof data.data.low !== 'string')
    throw new Error('data.low needs to be a string')
  if (!data.data.close) throw new Error('data needs "close"')
  if (typeof data.data.close !== 'string')
    throw new Error('data.close needs to be a string')
  if (!data.data.vwap) throw new Error('data needs "vwap"')
  if (typeof data.data.vwap !== 'string')
    throw new Error('data.vwap needs to be a string')
  if (!data.data.volume) throw new Error('data needs "volume"')
  if (typeof data.data.volume !== 'string')
    throw new Error('data.volume needs to be a string')
  if (!data.data.count) throw new Error('data needs "count"')
  if (typeof data.data.count !== 'string')
    throw new Error('data.count needs to be a string')

  return createEmitSubscriptionEventPublic({
    ...data,
    channelName: 'ohlc',
    data: [
      data.data.time,
      data.data.etime,
      data.data.open,
      data.data.high,
      data.data.low,
      data.data.close,
      data.data.vwap,
      data.data.volume,
      data.data.count,
    ],
  })
}
