export const createUnsubscribePayload = ({
  pairs,
  name,
  reqid,
  depth,
  interval,
  token,
}) => {
  const payload = {
    event: 'subscribe',
    pair: pairs,
    subscription: { name },
  }

  // add optional data to payload
  if (reqid) payload.reqid = reqid
  if (depth) payload.options.depth = depth
  if (interval) payload.options.interval = interval
  if (token) payload.options.token = token 

  return payload
}
