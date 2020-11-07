export const handleSystemStatus = (emit, { connectionID, status, version }) => {
  emit('kraken:systemStatus', { connectionID, status, version })
}
