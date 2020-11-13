export const hasSubscribedSuccessfully = payload =>
  payload.event === 'subscriptionStatus' && payload.status === 'subscribed'
