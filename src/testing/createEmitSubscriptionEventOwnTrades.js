import { createEmitSubscriptionEventPublic } from './utils/createEmitSubscriptionEventPublic'

export const createEmitSubscriptionEventOwnTrades = data => {
  if (!Array.isArray(data.data)) throw new Error('data needs to be an array')
  if (!Array.isArray(data.sequence)) throw new Error('Needs "sequence"')

  data.data.forEach((trade, index) => {
    if (!trade.txid) throw new Error(`trade[${index}] needs "price"`)
    if (!trade.cost) throw new Error(`trade[${index}] needs "cost"`)
    if (typeof trade.cost !== 'string') throw new Error(`trade[${index}].cost needs to be a string`)
    if (!trade.fee) throw new Error(`trade[${index}] needs "fee"`)
    if (typeof trade.fee !== 'string') throw new Error(`trade[${index}].fee needs to be a string`)
    if (!trade.margin) throw new Error(`trade[${index}] needs "margin"`)
    if (typeof trade.margin !== 'string') throw new Error(`trade[${index}].margin needs to be a string`)
    if (!trade.ordertxid) throw new Error(`trade[${index}] needs "ordertxid"`)
    if (typeof trade.ordertxid !== 'string') throw new Error(`trade[${index}].ordertxid needs to be a string`)
    if (!trade.ordertype) throw new Error(`trade[${index}] needs "ordertype"`)
    if (typeof trade.ordertype !== 'string') throw new Error(`trade[${index}].ordertype needs to be a string`)
    if (!trade.pair) throw new Error(`trade[${index}] needs "pair"`)
    if (typeof trade.pair !== 'string') throw new Error(`trade[${index}].pair needs to be a string`)
    if (!trade.postxid) throw new Error(`trade[${index}] needs "postxid"`)
    if (typeof trade.postxid !== 'string') throw new Error(`trade[${index}].postxid needs to be a string`)
    if (!trade.price) throw new Error(`trade[${index}] needs "price"`)
    if (typeof trade.price !== 'string') throw new Error(`trade[${index}].price needs to be a string`)
    if (!trade.time) throw new Error(`trade[${index}] needs "time"`)
    if (typeof trade.time !== 'string') throw new Error(`trade[${index}].time needs to be a string`)
    if (!trade.type) throw new Error(`trade[${index}] needs "type"`)
    if (typeof trade.type !== 'string') throw new Error(`trade[${index}].type needs to be a string`)
    if (!trade.vol) throw new Error(`trade[${index}] needs "vol"`)
  })

  return createEmitSubscriptionEventPublic({
    ...data,
    channelName: 'trade',
    data: data.data.map(({ txid, ...trade }) => ({ [txid]: trade }))
  })
}
