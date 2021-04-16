import { handleUnhandled } from '../handleUnhandled'

describe('handleUnhandled', () => {
  it('should return undefined when receiving an object', () => {
    const expected = undefined
    const actual = handleUnhandled({
      payload: { event: 'unhandled' }
    })

    expect(actual).toBe(expected)
  })

  it('should return a kraken:error event when then payload is not an object', () => {
    const payload = 42
    const event = JSON.stringify({ payload })

    const actual = handleUnhandled({ event, payload })
    const expected = {
      name: 'kraken:error',
      payload: {
        errorMessage: 'Payload received from kraken is not handled. Received "42"',
        error: event,
      }
    }

    expect(actual).toEqual(expected)
  })
})
