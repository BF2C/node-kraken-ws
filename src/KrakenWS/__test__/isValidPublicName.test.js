import { isValidPublicName } from '../isValidPublicName'

describe('isValidPublicName', () => {
  it('should return true when name is a valid public name', () => {
    expect(isValidPublicName('ticker')).toBe(true)
    expect(isValidPublicName('ohlc')).toBe(true)
    expect(isValidPublicName('trade')).toBe(true)
    expect(isValidPublicName('spread')).toBe(true)
    expect(isValidPublicName('book')).toBe(true)
  })

  it('should return false when name is not a valid public name', () => {
    expect(isValidPublicName('ownTrades')).toBe(false)
    expect(isValidPublicName('openOrders')).toBe(false)
  })
})
