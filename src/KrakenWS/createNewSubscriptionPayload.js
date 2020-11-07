export const createNewSubscriptionPayload = ({
  pairs,
  name,
  reqid,
  depth,
  interval,
  snapshot,
  token,
}) => {
  const payload = {
    event: 'subscribe',
    pair: pairs,
    subscription: { name },
  }

  // add optional data to payload
  if (reqid) payload.reqid = reqid
  if (depth) payload.subscription.depth = depth
  if (interval) payload.subscription.interval = interval
  if (snapshot) payload.subscription.snapshot = snapshot
  if (token) payload.subscription.token = token 

  return payload
}
