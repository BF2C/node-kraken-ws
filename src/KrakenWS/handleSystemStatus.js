export const handleSystemStatus = ({ payload }) => {
  if (payload.event !== 'systemStatus') return

  return {
    payload,
    name: 'kraken:systemStatus',
  }
}
