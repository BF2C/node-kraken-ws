export const createEmitSubscriptionEventPublic = data => {
  const emitData = []

  if (typeof data.channelID !== 'number') throw new Error('Needs channelID')
  emitData.push(data.channelID)

  if (!data.data) throw new Error('Needs data')
  emitData.push(data.data)

  if (!data.channelName) throw new Error('Needs channelName')
  emitData.push(data.channelName)

  if (!data.pair) throw new Error('Needs pair')
  emitData.push(data.pair)

  return emitData
}
