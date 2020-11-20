export const handleSubscriptionEvent = ({ payload }) => {
  if (!Array.isArray(payload) || !Number.isInteger(payload[0])) return
  return { name: 'kraken:subscription:event', payload }
}
