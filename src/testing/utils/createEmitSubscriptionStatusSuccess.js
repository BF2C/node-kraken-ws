export const createEmitSubscriptionStatusSuccess = data => {
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
    status: 'subscribed',
  }

  if (typeof data.channelID !== 'undefined') {
    emitData.channelID = data.channelID
  }

  if (!data.channelName) throw new Error('Need channelName')
  emitData.channelName = data.channelName

  if (typeof data.reqid !== 'undefined') {
    emitData.reqid = data.reqid
  }

  if (data.pair) {
    emitData.pair = data.pair
  }

  return emitData
}
