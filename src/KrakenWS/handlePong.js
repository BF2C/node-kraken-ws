export const handlePong = ({ payload }) => {
  const { reqid, event } = payload

  if (event !== 'pong') return

  const responsePayload = {}

  if (reqid) {
    responsePayload.reqid = reqid
  }

  return { name: 'kraken:pong', payload: responsePayload }
}
