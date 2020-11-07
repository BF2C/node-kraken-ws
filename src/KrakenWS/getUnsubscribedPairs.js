export const getUnsubscribedPairs = ({ subscriptions, pair, name }) => {
  const allPairs = Array.isArray(pair) ? pair : [pair]

  const alreadySubscribed = allPairs.reduce(
    (found, singlePair) => {
      if (subscriptions[singlePair] && subscriptions[singlePair].includes(name)) {
        return [...found, singlePair]
      }

      return found
    },
    [],
  )

  // make sure we don't subscribe twice to the same pair
  return allPairs.filter(singlePair => !alreadySubscribed.includes(singlePair))
}
