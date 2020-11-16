export const handlePong = ({ payload }) => {
  if (payload.event !== 'pong') return
  return { name: 'kraken:pong' }
}
