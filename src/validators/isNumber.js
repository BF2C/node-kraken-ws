module.exports.isNumber = (value) =>
  typeof value === 'number' && isFinite(value)
