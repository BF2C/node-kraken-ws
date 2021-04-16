import { isValidPrivateName } from '../isValidPrivateName'

describe('isValidPrivateName', () => {
  it('should return true when name is a valid public name', () => {
    expect(isValidPrivateName('ownTrades')).toBe(true)
    expect(isValidPrivateName('openOrders')).toBe(true)
  })

  it('should return false when name is not a valid public name', () => {
    expect(isValidPrivateName('ticker')).toBe(false)
    expect(isValidPrivateName('ohlc')).toBe(false)
    expect(isValidPrivateName('trade')).toBe(false)
    expect(isValidPrivateName('spread')).toBe(false)
    expect(isValidPrivateName('book')).toBe(false)
  })
})
