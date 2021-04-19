import { createEmitSubscriptionStatusError } from './utils/createEmitSubscriptionStatusError'

export const createEmitSubscriptionStatusSpreadError = data => {
  const emitData = {
    errorMessage: data.errorMessage,
    channelName: 'spread',
    pair: data.pair,
    subscription: { name: 'spread' },
  }

  if (typeof data.reqid !== 'undefined') {
    emitData.reqid = data.reqid
  }

  return createEmitSubscriptionStatusError(emitData)
}
