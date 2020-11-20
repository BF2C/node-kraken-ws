export const handleSubscriptionEvent = ({ payload }) => {
  if (!Array.isArray(payload)) return
  return { name: 'kraken:subscription:event', payload }
}
