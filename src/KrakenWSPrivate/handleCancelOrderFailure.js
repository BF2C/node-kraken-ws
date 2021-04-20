export const handleCancelOrderFailure = ({ payload }) => {
  if (payload.event !== 'cancelOrderStatus' || payload.status !== 'error')
    return false

  return { name: 'kraken:cancelorder:failure', payload }
}
