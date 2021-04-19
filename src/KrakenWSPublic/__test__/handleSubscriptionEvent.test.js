import { handleSubscriptionEvent } from '../handleSubscriptionEvent'

describe('handleSubscriptionEvent', () => {
  it('should emit a subscription event', () => {
    const payload = [10, {}, 'ticker', 'XBT/EUR']
    const expected = {
      name: 'kraken:subscription:event',
      payload: [10, {}, 'ticker', 'XBT/EUR'],
    }
    const actual = handleSubscriptionEvent({ payload })
    expect(actual).toEqual(expected)
  })

  it('should return undefined when payload is not an array', () => {
    const payload = { event: 'pong' }
    const expected = undefined
    const actual = handleSubscriptionEvent({ payload })
    expect(actual).toBe(expected)
  })

  it("should return undefined when payload's first item is not a number", () => {
    const payload = ['foo', {}, 'ticker', 'XBT/EUR']
    const expected = undefined
    const actual = handleSubscriptionEvent({ payload })
    expect(actual).toBe(expected)
  })

  it("should return undefined when payload's length is not 4", () => {
    const payload = [{}, 'ticker', 'XBT/EUR']
    const expected = undefined
    const actual = handleSubscriptionEvent({ payload })
    expect(actual).toBe(expected)
  })
})
