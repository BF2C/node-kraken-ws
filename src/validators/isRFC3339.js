/* Taken from: https://github.com/validatorjs/validator.js/blob/master/src/lib/isRFC3339.js */
const dateFullYear = /[0-9]{4}/
const dateMonth = /(0[1-9]|1[0-2])/
const dateMDay = /([12]\d|0[1-9]|3[01])/
const timeHour = /([01][0-9]|2[0-3])/
const timeMinute = /[0-5][0-9]/
const timeSecond = /([0-5][0-9]|60)/
const timeSecFrac = /(\.[0-9]+)?/
const timeNumOffset = new RegExp(`[-+]${timeHour.source}:${timeMinute.source}`)
const timeOffset = new RegExp(`([zZ]|${timeNumOffset.source})`)
const partialTime = new RegExp(
  `${timeHour.source}:${timeMinute.source}:${timeSecond.source}${timeSecFrac.source}`
)
const fullDate = new RegExp(
  `${dateFullYear.source}-${dateMonth.source}-${dateMDay.source}`
)
const fullTime = new RegExp(`${partialTime.source}${timeOffset.source}`)
const rfc3339 = new RegExp(`^${fullDate.source}[ tT]${fullTime.source}$`)

module.exports.isRFC3339 = (str) => rfc3339.test(str)