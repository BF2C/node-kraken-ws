export const handleUnsubscriptionSuccess = ({ payload }) => {
  if (
    payload.event !== 'subscriptionStatus' ||
    payload.status !== 'unsubscribed'
  )
    return

  return { name: 'kraken:unsubscribe:success', payload }
}
