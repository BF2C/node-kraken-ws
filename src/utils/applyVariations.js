const { z } = require('zod')

const mergeWithVariations = (variations) => (source) => {
  return variations.map((variation) => {
    return { ...source, ...variation }
  })
}

module.exports.applyVariations = (config, ...variations) =>
  variations.reduce(
    (sources, variations) => sources.flatMap(mergeWithVariations(variations)),
    [config]
  )
