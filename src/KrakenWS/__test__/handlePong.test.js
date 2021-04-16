import { handlePong } from '../handlePong'

describe('handlePong', () => {
  it('should return undefined when receiving a non-pong event', () => {
    const actual = handlePong({
      payload: {
        event: 'non-pong',
      }
    })

    const expected = undefined

    expect(actual).toBe(expected)
  })

  it('should return a pong event', () => {
    const actual = handlePong({
      payload: {
        event: 'pong',
      }
    })

    const expected = { name: 'kraken:pong' }

    expect(actual).toEqual(expected)
  })
})
