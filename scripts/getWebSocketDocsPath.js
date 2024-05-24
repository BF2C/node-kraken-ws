const { KRAKEN_API_CENTER_URI } = require('./constants.js')
const { getCheerioForUrl } = require('./getCheerioForUrl.js')

module.exports.getWebSocketDocsPath = async function getWebSocketDocsPath() {
  const $ = await getCheerioForUrl(KRAKEN_API_CENTER_URI)
  return $('a[href^="/api/docs/websocket-v2/"]').attr('href')
}
