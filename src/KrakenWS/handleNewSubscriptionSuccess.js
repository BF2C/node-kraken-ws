export const handleNewSubscriptionSuccess = (
  emit,
  subscriptions,
  payload,
) => {
  const { channelID, channelName, pair } = payload
  const { name } = payload.subscription
  const subscription = subscriptions[pair].find(sub => sub.name === name)

  subscription.channelID = channelID
  subscription.onEstablish(channelID)

  emit('kraken:newSubscriptionSuccess', {
    channelID,
    channelName,
    pair,
    subscription: payload.subscription,
  })
}
