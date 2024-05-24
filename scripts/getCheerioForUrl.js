const cheerio = require('cheerio')
const fetch = require('node-fetch')

module.exports.getCheerioForUrl = async function getCheerioForUrl(url) {
  const response = await fetch(url)
  const body = await response.text()
  return cheerio.load(body)
}
