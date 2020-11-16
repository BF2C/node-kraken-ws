export const handleHeartbeat = ({ payload }) => {
  if (payload.event !== 'heartbeat') return
  return { name: 'kraken:heartbeat' }
}
