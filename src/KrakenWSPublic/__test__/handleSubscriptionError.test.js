import { handleSubscriptionError } from '../handleSubscriptionError'

describe('handleSubscriptionError', () => {
  it('should emit a subscription failure', () => {
    const payload = {
      pair: 'XBT/EUR',
      event: 'subscriptionStatus',
      status: 'error',
      subscription: { name: 'ticker' }
    }
    const subscriptions = { ticker: {} }
    const expected = {
      name: 'kraken:subscribe:failure',
      payload: {
        pair: 'XBT/EUR',
        event: 'subscriptionStatus',
        status: 'error',
        subscription: { name: 'ticker' }
      },
    }
    const actual = handleSubscriptionError({ payload, subscriptions })
    expect(actual).toEqual(expected)
  })

  it('should return undefined when the event is not "subscriptionStatus"', () => {
    const payload = { event: 'pong' }
    const subscriptions = {}
    const expected = undefined
    const actual = handleSubscriptionError({ payload, subscriptions })
    expect(actual).toBe(expected)
  })

  it('should return undefined when the status is not "error"', () => {
    const payload = {
      pair: 'XBT/EUR',
      event: 'subscriptionStatus',
      status: 'success',
      subscription: { name: 'ticker' }
    }
    const subscriptions = {}
    const expected = undefined
    const actual = handleSubscriptionError({ payload, subscriptions })
    expect(actual).toBe(expected)
  })

  it('should return undefined when already subscribed', () => {
    const payload = {
      pair: 'XBT/EUR',
      event: 'subscriptionStatus',
      status: 'error',
      subscription: { name: 'ticker' }
    }

    const subscriptions = {
      ticker: { 'XBT/EUR': true }
    }

    const expected = undefined
    const actual = handleSubscriptionError({ payload, subscriptions })
    expect(actual).toBe(expected)
  })
})
