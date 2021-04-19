import { createEmitSubscriptionStatusError } from './utils/createEmitSubscriptionStatusError'

export const createEmitSubscriptionStatusOpenOrdersError = data => {
  const emitData = {
    errorMessage: data.errorMessage,
    subscription: { name: 'openOrders' },
  }

  if (typeof data.reqid !== 'undefined') {
    emitData.reqid = data.reqid
  }

  return createEmitSubscriptionStatusError(emitData)
}
