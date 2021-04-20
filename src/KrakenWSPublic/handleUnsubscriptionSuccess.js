export const handleUnsubscriptionSuccess = ({ payload, subscriptions }) => {
  const alreadySubscribed =
    payload.subscription &&
    subscriptions[payload.subscription.name] &&
    subscriptions[payload.subscription.name][payload.pair]

  if (
    payload.event !== 'subscriptionStatus' ||
    payload.status !== 'unsubscribed' ||
    !alreadySubscribed
  )
    return

  return { name: 'kraken:unsubscribe:success', payload }
}
