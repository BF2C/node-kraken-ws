module.exports.isUUIDShort = (value) => {
  return value.match(/^[a-z0-9A-Z]{32}$/)
}
