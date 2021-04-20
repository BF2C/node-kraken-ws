import { handleUnsubscriptionSuccess } from '../handleUnsubscriptionSuccess'

describe('handleUnsubscriptionSuccess', () => {
  it('should emit a subscription success', () => {
    const payload = {
      pair: 'XBT/EUR',
      event: 'subscriptionStatus',
      status: 'unsubscribed',
      subscription: { name: 'ticker' },
    }

    const subscriptions = {
      ticker: { 'XBT/EUR': true },
    }

    const expected = {
      name: 'kraken:unsubscribe:success',
      payload: {
        pair: 'XBT/EUR',
        event: 'subscriptionStatus',
        status: 'unsubscribed',
        subscription: { name: 'ticker' },
      },
    }

    const actual = handleUnsubscriptionSuccess({ payload, subscriptions })
    expect(actual).toEqual(expected)
  })

  it('should return undefined when the event is not "subscriptionStatus"', () => {
    const payload = { event: 'pong' }
    const subscriptions = { ticker: { 'XBT/EUR': true } }
    const expected = undefined
    const actual = handleUnsubscriptionSuccess({ payload, subscriptions })
    expect(actual).toBe(expected)
  })

  it('should return undefined when the status is not "unsubscribed"', () => {
    const payload = {
      pair: 'XBT/EUR',
      event: 'subscriptionStatus',
      status: 'subscribed',
      subscription: { name: 'ticker' },
    }

    const subscriptions = {
      ticker: { 'XBT/EUR': true },
    }

    const expected = undefined
    const actual = handleUnsubscriptionSuccess({ payload, subscriptions })
    expect(actual).toBe(expected)
  })

  it('should return undefined when not subscribed', () => {
    const payload = {
      pair: 'XBT/EUR',
      event: 'subscriptionStatus',
      status: 'unsubscribed',
      subscription: { name: 'ticker' },
    }

    const subscriptions = {
      ticker: { 'XBT/USD': true },
    }

    const expected = undefined
    const actual = handleUnsubscriptionSuccess({ payload, subscriptions })
    expect(actual).toBe(expected)
  })
})
