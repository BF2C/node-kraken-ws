export const handleSubscriptionEvent = ({ payload }) => {
  if (!Array.isArray(payload) || !Number.isInteger(payload[0])) return

  const event = {
    channelID: payload[0],
    data: payload[1],
    name: payload[2],
    pair: payload[3],
  }

  return { name: 'kraken:subscription:event', payload: event }
}
