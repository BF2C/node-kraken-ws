export const getSubscribedPairs = ({ subscriptions, pair, name }) => {
  const allPairs = Array.isArray(pair) ? pair : [pair]

  return allPairs.reduce(
    (found, singlePair) => {
      if (subscriptions[singlePair] && subscriptions[singlePair].includes(name)) {
        return [...found, singlePair]
      }

      return found
    },
    [],
  )
}
