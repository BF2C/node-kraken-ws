import { createEmitSubscriptionEventPublic } from './utils/createEmitSubscriptionEventPublic'

export const createEmitSubscriptionEventOpenOrders = data => {
  if (!Array.isArray(data.data)) throw new Error('data needs to be an array')
  if (!Array.isArray(data.sequence)) throw new Error('Needs "sequence"')

  data.data.forEach((trade, index) => {
    if (!trade.txid) throw new Error(`trade[${index}] needs "price"`)
  })

  return createEmitSubscriptionEventPublic({
    ...data,
    channelName: 'trade',
    data: data.data.map(({ txid, ...trade }) => ({ [txid]: trade }))
  })
}
