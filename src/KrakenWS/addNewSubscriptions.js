// keep register of active subscriptions
export const addNewSubscriptions = (subscriptions, pairs, name) => {
  return pairs.map(singlePair => {
    if (!subscriptions[singlePair]) {
      subscriptions[singlePair] = []
    }

    let success, failure
    const onReady = new Promise((resolve, reject) => {
      success = resolve
      failure = reject
    })

    subscriptions[singlePair].push({
      name,
      channelID: null,
      onEstablish: success,
      onFail: failure,
    })

    return onReady
  })
}
