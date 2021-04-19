import { handleSubscriptionSuccess } from '../handleSubscriptionSuccess'

describe('handleSubscriptionSuccess', () => {
  it('should emit a subscription success', () => {
    const payload = {
      pair: 'XBT/EUR',
      event: 'subscriptionStatus',
      status: 'subscribed',
      subscription: { name: 'ticker' }
    }
    const expected = {
      name: 'kraken:subscribe:success',
      payload: {
        pair: 'XBT/EUR',
        event: 'subscriptionStatus',
        status: 'subscribed',
        subscription: { name: 'ticker' }
      },
    }
    const actual = handleSubscriptionSuccess({ payload })
    expect(actual).toEqual(expected)
  })

  it('should return undefined when the event is not "subscriptionStatus"', () => {
    const payload = { event: 'pong' }
    const expected = undefined
    const actual = handleSubscriptionSuccess({ payload })
    expect(actual).toBe(expected)
  })

  it('should return undefined when the status is not "subscribed"', () => {
    const payload = {
      pair: 'XBT/EUR',
      event: 'subscriptionStatus',
      status: 'error',
      subscription: { name: 'ticker' }
    }
    const expected = undefined
    const actual = handleSubscriptionSuccess({ payload })
    expect(actual).toBe(expected)
  })
})
