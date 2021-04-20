export const handleSubscriptionSuccess = ({ payload }) => {
  if (payload.event !== 'subscriptionStatus' || payload.status !== 'subscribed')
    return

  return { name: 'kraken:subscribe:success', payload }
}
