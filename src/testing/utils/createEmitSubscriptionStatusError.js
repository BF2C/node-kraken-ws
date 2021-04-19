export const createEmitSubscriptionStatusError = data => {
  const subscription = {}

  if (data.subscription.depth) {
    subscription.depth = data.subscription.depth
  }

  if (data.subscription.interval) {
    subscription.interval = data.subscription.interval
  }

  if (data.subscription.maxratecount) {
    subscription.maxratecount = data.subscription.maxratecount
  }

  if (data.subscription.name) {
    subscription.name = data.subscription.name
  }

  if (data.subscription.token) {
    subscription.token = data.subscription.token
  }

  const emitData = {
    subscription,
    event: 'subscriptionStatus',
    status: 'error',
  }

  if (!data.errorMessage) throw new Error('Need errorMessage')
  emitData.errorMessage = data.errorMessage

  if (typeof data.reqid !== 'undefined') {
    emitData.reqid = data.reqid
  }

  if (data.pair) {
    emitData.pair = data.pair
  }

  return emitData
}
