const { Server } = require('mock-socket')
const { WebSocketServer } = require('ws')
const { addOrder, connect, disconnect } = require('../index')

jest.mock('../constants/kraken', () => ({
  WS_URL_PRIVATE: 'ws://localhost:12345',
}))

describe('addOrder', () => {
  const server = new WebSocketServer({ port: 12345 })

  afterAll(() => {
    server.close()
  })

  it('should add a limit order', async () => {
    const serverConnection = new Promise(resolve => server.on('connection', resolve))
    const clientConnection = await connect({ authenticated: true })

    addOrder(clientConnection, {
      params: {
        order_type: 'limit',
        side: 'buy',
        order_qty: 2,
        symbol: 'BTCUSD',
        token: 'foobar',
      },
      reqId: 42,
    })

    const message = await serverConnection.then((socket) => {
      return new Promise(resolve => socket.on('message', resolve))
    })

    await expect(JSON.parse(message)).toEqual({
      method: 'add_order',
      params: {
        order_type: 'limit',
        side: 'buy',
        order_qty: 2,
        symbol: 'BTCUSD',
        token: 'foobar',
      },
      reqId: 42,
    })

    disconnect(clientConnection)
  })

  it('should add a limit order', async () => {
    const serverConnection = new Promise(resolve => server.on('connection', resolve))
    const clientConnection = await connect({ authenticated: true })

    addOrder(clientConnection, {
      params: {
        order_type: 'limit',
        side: 'buy',
        order_qty: 3,
        symbol: 'BTCUSD',
        token: 'foobar',
      },
      reqId: 42,
    })

    const message = await serverConnection.then((socket) => {
      return new Promise(resolve => socket.on('message', resolve))
    })

    await expect(JSON.parse(message)).toEqual({
      method: 'add_order',
      params: {
        order_type: 'limit',
        side: 'buy',
        order_qty: 3,
        symbol: 'BTCUSD',
        token: 'foobar',
      },
      reqId: 42,
    })

    disconnect(clientConnection)
  })
})
