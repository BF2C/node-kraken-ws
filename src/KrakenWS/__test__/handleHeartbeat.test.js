import { handleHeartbeat } from '../handleHeartbeat'

describe('handleHeartbeat', () => {
  it('should return undefined when receiving a non-heartbeat event', () => {
    const actual = handleHeartbeat({
      payload: {
        event: 'non-heartbeat',
      },
    })

    const expected = undefined

    expect(actual).toBe(expected)
  })

  it('should return a heartbeat event', () => {
    const actual = handleHeartbeat({
      payload: {
        event: 'heartbeat',
      },
    })

    const expected = { name: 'kraken:heartbeat' }

    expect(actual).toEqual(expected)
  })
})
