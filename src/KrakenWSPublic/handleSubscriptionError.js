export const handleSubscriptionError = ({ payload, subscriptions }) => {
  const alreadySubscribed =
    payload.subscription &&
    subscriptions[payload.subscription.name][payload.pair]

  if (
    payload.event !== 'subscriptionStatus' ||
    payload.status !== 'error' ||
    alreadySubscribed
  ) return

  return { name: 'kraken:subscribe:failure', payload }
}
