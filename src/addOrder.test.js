const EventEmitter = require('events')
const { addOrder } = require('./addOrder')

describe('addOrder - passing param validation', () => {
  const conn = new EventEmitter()
  conn.send = jest.fn()

  afterEach(() => {
    conn.send.mockClear()
  })

  it('should return a promise that rejects', () => {
    const promise = addOrder(conn, {
      params: {
        limit_price: 1000,
        side: 'buy',
        order_type: 'limit',
        symbol: 'BTC/USD',
        order_qty: 2,
        token: 'foobar',
      },
      reqId: 1,
    })

    conn.emit('add_order', { success: false, req_id: 1 })

    expect(promise).rejects.toEqual({ success: false, req_id: 1 })
  })

  it('should return a promise that resolves', () => {
    const promise = addOrder(conn, {
      params: {
        limit_price: 1000,
        side: 'buy',
        order_type: 'limit',
        symbol: 'BTC/USD',
        order_qty: 2,
        token: 'foobar',
      },
      reqId: 1,
    })

    conn.emit('add_order', { success: true, req_id: 1 })

    expect(promise).resolves.toEqual({ success: true, req_id: 1 })
  })

  it('should add a limit order', async () => {
    addOrder(conn, {
      params: {
        limit_price: 1000,
        side: 'buy',
        order_type: 'limit',
        symbol: 'BTC/USD',
        order_qty: 2,
        token: 'foobar',
      },
    })

    expect(conn.send).toHaveBeenCalledTimes(1)
    expect(conn.send.mock.calls[0]).toEqual([
      {
        method: 'add_order',
        params: {
          limit_price: 1000,
          order_type: 'limit',
          side: 'buy',
          symbol: 'BTC/USD',
          order_qty: 2,
          token: 'foobar',
        },
      },
    ])
  })

  it('should add a market order', async () => {
    addOrder(conn, {
      params: {
        order_type: 'market',
        side: 'buy',
        order_qty: 2,
        symbol: 'BTC/USD',
        token: 'foobar',
      },
    })

    expect(conn.send).toHaveBeenCalledTimes(1)
    expect(conn.send.mock.calls[0]).toEqual([
      {
        method: 'add_order',
        params: {
          order_type: 'market',
          side: 'buy',
          order_qty: 2,
          symbol: 'BTC/USD',
          token: 'foobar',
        },
      },
    ])
  })
})

describe('addOrder - invalid params failure', () => {
  it('should not pass validation with an unknown order_type', () => {
    const shouldThrow = () =>
      addOrder(null, {
        params: {
          order_type: 'foo',
          side: 'buy',
          order_qty: 2,
          symbol: 'BTC/USD',
          token: 'foobar',
        },
        reqId: 42,
      })

    expect(shouldThrow).toThrow()
  })
})
