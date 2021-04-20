import { createEmitSubscriptionEventPublic } from './utils/createEmitSubscriptionEventPublic'

export const createEmitSubscriptionEventBook = data => {
  if (!Array.isArray(data.data.as))
    throw new Error('data.as needs to be an array')
  data.data.as.forEach((as, index) => {
    if (!as.price) throw new Error(`as[${index}] needs "price"`)
    if (typeof as.price !== 'string')
      throw new Error(`as[${index}].price must be a string`)
    if (!as.volume) throw new Error(`as[${index}] needs "volume"`)
    if (typeof as.volume !== 'string')
      throw new Error(`as[${index}].volume must be a string`)
    if (!as.timestamp) throw new Error(`as[${index}] needs "timestamp"`)
    if (typeof as.timestamp !== 'string')
      throw new Error(`as[${index}].timestamp must be a string`)
  })

  if (!Array.isArray(data.data.bs))
    throw new Error('data.bs needs to be an array')
  data.data.bs.forEach((bs, index) => {
    if (!bs.price) throw new Error(`bs[${index}] needs "price"`)
    if (typeof bs.price !== 'string')
      throw new Error(`bs[${index}].price must be a string`)
    if (!bs.volume) throw new Error(`bs[${index}] needs "volume"`)
    if (typeof bs.volume !== 'string')
      throw new Error(`bs[${index}].volume must be a string`)
    if (!bs.timestamp) throw new Error(`bs[${index}] needs "timestamp"`)
    if (typeof bs.timestamp !== 'string')
      throw new Error(`bs[${index}].timestamp must be a string`)
  })

  return createEmitSubscriptionEventPublic({
    ...data,
    channelName: 'book',
    data: {
      as: data.data.as.map(as => [as.price, as.volume, as.timestamp]),
      bs: data.data.bs.map(bs => [bs.price, bs.volume, bs.timestamp]),
    },
  })
}
