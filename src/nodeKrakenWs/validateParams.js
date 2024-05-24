const { isBoolean, isInteger, isNumber, isString } = require('../validators/index')

const typeValidators = {
	boolean: isBoolean,
  string: isString,
	integer: isInteger,
  float: isNumber,
	object: v => typeof v === 'object',
	'array of string': v => typeof v === 'array' && v.every(isString),
	'array of integer': v => typeof v === 'array' && v.every(isInteger),
}

module.exports.validateParams = ({ values,
  params,
  fieldSchemas,
  parentPath = '',
}) => fieldSchemas.forEach(fieldSchema => {
	const hasValue = typeof values[fieldSchema.name] !== 'undefined'
	const value = values[fieldSchema.name]
	const name = parentPath ? `${parentPath}.${fieldSchema.name}` : fieldSchema.name

	if (fieldSchema.required && !hasValue) {
  	throw new Error(`Param "${name}" is required`)
	}

	if (hasValue && !typeValidators[fieldSchema.type](value)) {
  	throw new Error(`The type of param "${name}" is "${fieldSchema.type}", but received "${typeof value}"`)
	}

	if (hasValue && fieldSchema.type === 'object') {
  	fieldSchema.fields.forEach(field => {
    	validateParams({
      	values: value[field.name],
      	fieldSchemas: field,
      	parentPath: name,
      	params,
    	})
  	})
	}

	if (hasValue && fieldSchema.type === 'array of objects') {
  	value.forEach((item, index) => {
    	fieldSchema.fields.forEach(field => {
      	validateParams({
        	values: item[field.name],
        	fieldSchemas: field,
        	parentPath: `${name}[${index}]`,
        	params,
      	})
    	})
  	})
	}


	if (
  	hasValue
  	&& fieldSchema.type === 'string'
  	&& fieldSchema.valueType === 'enum'
  	&& !fieldSchema.possibleValues.includes(value)
	) {
  	const oneOf = fieldSchema.possibleValues.map(v => `"${v}"`).join(', ')
  	throw new Error(`Param "${name}" must be one of: ${oneOf}. But received "${value}"`)
	}

	if (hasValue && typeof fieldSchema.condition === 'function') {
  	fieldSchema.condition({ params, name, parentPath })
	}

	if (hasValue && typeof fieldSchema.format === 'function') {
  	const failure = fieldSchema.format(value)
  	if (failure) {
    	throw new Error(`Format invalid: ${failure}`)
  	}
	}
})
