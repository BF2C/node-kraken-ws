export const handleSubscriptionEvent = ({ payload }) => {
  if (!Array.isArray(payload)) return

  const event = {
    data: payload[0],
    name: payload[1],
    meta: payload[2],
  }

  return { name: 'kraken:subscription:event', payload: event }
}
