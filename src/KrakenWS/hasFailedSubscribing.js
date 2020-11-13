export const hasFailedSubscribing = payload =>
  payload.event === 'subscriptionStatus' &&
  payload.status === 'error'
