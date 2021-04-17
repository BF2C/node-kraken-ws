export const handlePong = ({ payload }) => {
  const { reqid, event } = payload

  if (event !== 'pong') return
  if (typeof reqid === 'undefined') throw new Error('payload does not have a reqid')

  return { name: 'kraken:pong', payload: { reqid } }
}
