export const handleUnhandled = ({ payload, event }) => {
  if (payload instanceof Object) {
    return undefined
  }

  return {
    name: 'kraken:error',
    payload: {
      errorMessage:
        `Payload received from kraken is not handled. Received "${payload}"`,
      error: event,
    }
  }
}
