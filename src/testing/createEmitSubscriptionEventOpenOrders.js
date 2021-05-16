import { createEmitSubscriptionEventPrivate } from './utils/createEmitSubscriptionEventPrivate'

export const createEmitSubscriptionEventOpenOrders = data => {
  if (!Array.isArray(data.data)) throw new Error('data needs to be an array')
  if (typeof data.sequence === 'undefined') throw new Error('Needs "sequence"')

  data.data.forEach((trade, index) => {
    if (!trade.txid) throw new Error(`trade[${index}] needs "price"`)
  })

  const updatedData = data.data.map(({ txid, ...trade }) => ({
    [txid]: trade,
  }))

  return createEmitSubscriptionEventPrivate({
    ...data,
    channelName: 'openOrders',
    data: updatedData,
  })
}
