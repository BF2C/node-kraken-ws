import { handleSystemStatus } from '../handleSystemStatus'

describe('handleSystemStatus', () => {
  it('should return undefined when receiving a non-systemStatus event', () => {
    const actual = handleSystemStatus({
      payload: {
        event: 'non-systemStatus',
      },
    })

    const expected = undefined

    expect(actual).toBe(expected)
  })

  it('should return a systemStatus event', () => {
    const actual = handleSystemStatus({
      payload: {
        event: 'systemStatus',
      },
    })

    const expected = {
      name: 'kraken:systemStatus',
      payload: {
        event: 'systemStatus',
      },
    }

    expect(actual).toEqual(expected)
  })
})
