export const removeSubscriptions = (subscriptions, pairs, name) => {
  pairs.forEach(pair => {
    if (subscriptions[pair]) {
      const index = subscriptions[pair].findIndex(n => n === name)

      if (index !== -1) {
        subscriptions[pair].splice(index, 1)
      }
    }
  })
}
