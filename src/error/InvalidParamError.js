class InvalidParamError extends Error {
  constructor(paramName, received, mustBe) {
    super(
      `Invalid param "${paramName}". Received "${received}". Must be one of: ${mustBe}`
    )
  }
}

module.exports.InvalidParamError = InvalidParamError
