import { createEmitSubscriptionEventPublic } from './utils/createEmitSubscriptionEventPublic'

export const createEmitSubscriptionEventTrade = data => {
  if (!Array.isArray(data.data)) throw new Error('data needs to be an array')

  data.data.forEach((trade, index) => {
    if (!trade.price) throw new Error(`trade[${index}] needs "price"`)
    if (typeof trade.price !== 'string') throw new Error(`trade[${index}].price must be a string`)
    if (!trade.volume) throw new Error(`trade[${index}] needs "volume"`)
    if (typeof trade.volume !== 'string') throw new Error(`trade[${index}].volume must be a string`)
    if (!trade.type) throw new Error(`trade[${index}] needs "type"`)
    if (typeof trade.type !== 'string') throw new Error(`trade[${index}].type must be a string`)
    if (!trade.side) throw new Error(`trade[${index}] needs "side"`)
    if (typeof trade.side !== 'string') throw new Error(`trade[${index}].side must be a string`)
    if (!trade.orderType) throw new Error(`trade[${index}] needs "orderType"`)
    if (typeof trade.orderType !== 'string') throw new Error(`trade[${index}].orderType must be a string`)
    if (!trade.misc) throw new Error(`trade[${index}] needs "misc"`)
    if (typeof trade.misc !== 'string') throw new Error(`trade[${index}].misc must be a string`)
  })

  return createEmitSubscriptionEventPublic({
    ...data,
    channelName: 'trade',
    data: data.data.map(trade => [
      trade.price,
      trade.volume,
      trade.type,
      trade.side,
      trade.orderType,
      trade.misc,
    ])
  })
}
