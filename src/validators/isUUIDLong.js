module.exports.isUUIDLong = (value) => {
  if (value.length !== 36) return false

  const parts = value.split('-')
  if (parts.length !== 5) return false
  if (parts[0].length !== 8) return false
  if (parts[1].length !== 4) return false
  if (parts[2].length !== 4) return false
  if (parts[3].length !== 4) return false
  if (parts[4].length !== 12) return false

  return parts.every((v) => v.match(/^[a-z0-9A-Z]+$/))
}
