// Only static for development purposes
const { apiMethods: tempMethods } = require('./apiMethods.js')
const { KRAKEN_API_CENTER_HOST } = require('./constants.js')
const { getCheerioForUrl } = require('./getCheerioForUrl.js')

function getArrayOfObjectsSchemaFromEl($el, $) {
  const name = $el.find('.openapi-schema__property').first().text()
  const required = !!$el.find('.openapi-schema__required').length
  const $object = $el.find('.openapi-schema__list-item').first()
  const { fields } = getObjectSchemaFromEl($object, $)
  return { type: 'array of objects', name, required, fields }
}

function getArrayOfIntegerSchemaFromEl($el) {
  const name = $el.find('.openapi-schema__property').first().text()
  const required = !!$el.find('.openapi-schema__required').length
  return { type: 'array of integer', name, required }
}

function getArrayOfStringSchemaFromEl($el) {
  const name = $el.find('.openapi-schema__property').first().text()
  const required = !!$el.find('.openapi-schema__required').length
  return { type: 'array of string', name, required }
}

function getBooleanSchemaFromEl($el) {
  const name = $el.find('.openapi-schema__property').first().text()
  const required = !!$el.find('.openapi-schema__required').length
  return { type: 'boolean', name, required }
}

function getFloatSchemaFromEl($el) {
  const name = $el.find('.openapi-schema__property').first().text()
  const required = !!$el.find('.openapi-schema__required').length
  return { type: 'float', name, required }
}

function getIntegerSchemaFromEl($el) {
  const name = $el.find('.openapi-schema__property').first().text()
  const required = !!$el.find('.openapi-schema__required').length
  return { type: 'integer', name, required }
}

function getStringValueType(apiParamAttributes) {
  if (apiParamAttributes.match('(^|: )Value:')) return 'constant'
  if (apiParamAttributes.match('(^|: )Possible values:')) return 'enum'
  return 'any'
}

function determinePossibleValues(valueType, $el, $) {
  if (valueType === 'constant') {
    return [$el.find('code').text()]
  }

  // enum
  return $el
    .find('.api-param-attribute:contains("Possible values:") ~ code')
    .toArray()
    .map((code) => $(code).text().trim())
}

function getStringSchemaFromEl($el, $) {
  const name = $el.find('.openapi-schema__property').first().text()
  const required = !!$el.find('.openapi-schema__required').length
  const apiParamAttributes = $el.find('.api-param-attribute').text().trim()
  const valueType = !apiParamAttributes.length
    ? 'any'
    : getStringValueType(apiParamAttributes)

  const defaultValue =
    $el.find('.api-param-attribute:contains("Default value:") + code').text() ||
    undefined
  const format =
    $el.find('.api-param-attribute:contains("Format:") + code').text() ||
    undefined

  const possibleValues = ['constant', 'enum'].includes(valueType)
    ? determinePossibleValues(valueType, $el, $)
    : undefined

  return {
    type: 'string',
    name,
    required,
    valueType,
    possibleValues,
    defaultValue,
    format,
  }
}

function getObjectSchemaFromEl($el, $) {
  const name = $el.find('.openapi-schema__property').first().text()
  const required = !!$el.find('.openapi-schema__required').length

  const $properties = $el.find(
    '> div > .openapi-schema__container ~ *:last-child > .openapi-schema__list-item'
  )
  const fields = $properties.toArray().map((el) => getSchemaFromEl($(el), $))

  return { type: 'object', name, required, fields }
}

const typesToHandler = {
  string: getStringSchemaFromEl,
  object: getObjectSchemaFromEl,
  float: getFloatSchemaFromEl,
  boolean: getBooleanSchemaFromEl,
  integer: getIntegerSchemaFromEl,
  'array of string': getArrayOfStringSchemaFromEl,
  'array of integer': getArrayOfIntegerSchemaFromEl,
  'array [': getArrayOfObjectsSchemaFromEl,
}
function getSchemaFromEl($el, $) {
  const name = $el.find('.openapi-schema__property').first().text()
  const type = $el.find('.openapi-schema__type').first().text().trim()
  const required = !!$el.find('.openapi-schema__required').length
  const handler = typesToHandler[type]

  if (!handler) {
    throw new Error(`No implementation for schema type "${type}"`)
  }

  return handler($el, $)
}

async function getSchemaForRequest(requestInfo) {
  const { url } = requestInfo
  const $ = await getCheerioForUrl(url)
  const $requestSection = $(
    '#request + div [role="tabpanel"]:first-child > div'
  )
  const $messageBodyProps = $requestSection.find('> div')
  const method = getSchemaFromEl($messageBodyProps.eq(0), $)
  const params = getSchemaFromEl($messageBodyProps.eq(1), $)
  const reqId = getSchemaFromEl($messageBodyProps.eq(2), $)
  return {
    ...requestInfo,
    requestSchema: { method, params, reqId },
  }
}

async function getSchema(apiMethod) {
  if (apiMethod.type === 'request') {
    return getSchemaForRequest(apiMethod)
  }

  throw new Error(`No implementation for api method type "${apiMethod.type}"`)
}

async function createSchemaFromApiMethods(apiMethods = tempMethods) {
  const _ = [...apiMethods.slice(0, 7), ...apiMethods.slice(-1)]
  const schemas = await Promise.all(_.map(getSchema))
  console.log(JSON.stringify(schemas, null, 2))
}

module.exports.createSchemaFromApiMethods = createSchemaFromApiMethods
createSchemaFromApiMethods().catch(console.error)
