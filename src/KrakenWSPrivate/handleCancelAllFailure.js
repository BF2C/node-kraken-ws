export const handleCancelAllFailure = ({ payload }) => {
  if (
    payload.event !== 'cancelAllStatus' ||
    payload.status !== 'error'
  ) return false

  return { name: 'kraken:cancelall:failure', payload }
}
