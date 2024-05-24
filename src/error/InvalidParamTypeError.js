class InvalidParamTypeError extends Error {
  constructor(paramName, received, mustBe) {
    super(`Invalid type for param "${paramName}". Received type "${received}". Must be: ${mustBe}`)
  }
}

module.exports.InvalidParamTypeError = InvalidParamTypeError
