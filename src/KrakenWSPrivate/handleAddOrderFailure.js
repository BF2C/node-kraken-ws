export const handleAddOrderFailure = ({ payload }) => {
  if (payload.event !== 'addOrderStatus' || payload.status !== 'error')
    return false

  return { name: 'kraken:addorder:failure', payload }
}
