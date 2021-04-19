export const handleSubscriptionEvent = ({ payload }) => {
  if (
    !Array.isArray(payload) ||
    !Number.isInteger(payload[0]) ||
    payload.length !== 4
  ) return

  return { name: 'kraken:subscription:event', payload }
}
