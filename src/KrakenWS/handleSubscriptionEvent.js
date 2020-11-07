export const handleSubscriptionEvent = (emit, payload) => {
  const [channelID, data, subsciptionName, pair] = payload
  emit('kraken:subscription', { channelID, data, subsciptionName, pair })
}
