export const handleCancelOrderSuccess = ({ payload }) => {
  if (payload.event !== 'cancelOrderStatus' || payload.status !== 'ok')
    return false

  return { name: 'kraken:cancelorder:success', payload }
}
