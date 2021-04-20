export const handleAddOrderSuccess = ({ payload }) => {
  if (payload.event !== 'addOrderStatus' || payload.status !== 'ok')
    return false

  return { name: 'kraken:addorder:success', payload }
}
