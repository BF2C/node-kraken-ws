export const handleCancelAllSuccess = ({ payload }) => {
  if (
    payload.event !== 'cancelAllStatus' ||
    payload.status !== 'ok'
  ) return false

  return { name: 'kraken:cancelall:success', payload }
}
