const { KRAKEN_API_CENTER_HOST } = require('./constants.js')
const { getCheerioForUrl } = require('./getCheerioForUrl.js')

async function getWebSocketsApiMethods(webSocketDocsUri) {
  const $ = await getCheerioForUrl(webSocketDocsUri)
  return $('.theme-doc-sidebar-item-category-level-2').toArray().flatMap((li) => {
    const $li = $(li)
    const groupName = $li.find('> .menu__list-item-collapsible').text()
    return $li.find('.api-method a[href]').toArray().map((a) => {
      const $a = $(a)
      const url = `${KRAKEN_API_CENTER_HOST}/${$a.attr('href')}`
      const apiMethod = $a.text()
      return { group: groupName, apiMethod, url }
    })
  })
}
