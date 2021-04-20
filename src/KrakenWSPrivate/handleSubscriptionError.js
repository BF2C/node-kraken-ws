export const handleSubscriptionError = ({ payload, subscriptions }) => {
  if (
    payload.event !== 'subscriptionStatus' ||
    payload.status !== 'error'
  ) return

  return { name: 'kraken:subscribe:error', payload }
}
