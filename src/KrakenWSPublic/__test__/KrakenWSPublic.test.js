import EventEmitter from 'events'
import { Server, WebSocket } from 'mock-socket'
import _WebSocket from 'ws'
import {
  createEmitSubscriptionStatusSpreadError,
  createEmitSubscriptionStatusSpreadSuccess,
  createEmitSubscriptionStatusTickerSuccess,
  createEmitSubscriptionStatusTradeSuccess,
  createEmitSubscriptionStatusOhlcSuccess,
  createEmitSubscriptionStatusBookSuccess,
} from '../../testing'
import { KrakenWSPublic } from '../KrakenWSPublic'

describe('KrakenWSPublic', () => {
  let server, client
  const url = 'ws://public.url.com'

  beforeEach(() => {
    server = new Server(url)
    server.on('connection', socket => {
      client = socket
    })
  })

  afterEach(() => {
    server.stop()
    client = null
  })

  describe('constructor', () => {
    it('should set the set options', () => {
      const instance = new KrakenWSPublic()

      expect(instance._options).toEqual(
        expect.objectContaining({
          url: 'wss://ws.kraken.com',
          autoPing: false,
          eventEmitterMaxListeners: 100,
          retryCount: 5,
          retryDelay: 100,
          maxReconnects: Infinity,
        })
      )

      expect(instance._options.WebSocket).toBe(_WebSocket)
      expect(instance._options.EventEmitter).toBe(EventEmitter)
      expect(instance._options.log).toBeInstanceOf(Function)
    })

    it('should overwrite default options with provided options', () => {
      class Foo extends EventEmitter {}

      const defaultOptions = {
        url: 'wss://ws.kraken.com',
        autoPing: false,
        eventEmitterMaxListeners: 100,
        retryCount: 5,
        retryDelay: 100,
        maxReconnects: Infinity,
      }

      const instanceWS = new KrakenWSPublic({ WebSocket })
      expect(instanceWS._options).toEqual(
        expect.objectContaining(defaultOptions)
      )
      expect(instanceWS._options.WebSocket).toBe(WebSocket)
      expect(instanceWS._options.EventEmitter).toBe(EventEmitter)
      expect(instanceWS._options.log).toBeInstanceOf(Function)

      const instanceEE = new KrakenWSPublic({ EventEmitter: Foo })
      expect(instanceEE._options).toEqual(
        expect.objectContaining(defaultOptions)
      )
      expect(instanceEE._options.WebSocket).toBe(_WebSocket)
      expect(instanceEE._options.EventEmitter).toBe(Foo)
      expect(instanceEE._options.log).toBeInstanceOf(Function)

      const instanceUrl = new KrakenWSPublic({ url: 'ws://foo.com' })
      expect(instanceUrl._options).toEqual(
        expect.objectContaining({
          ...defaultOptions,
          url: 'ws://foo.com',
        })
      )
      expect(instanceUrl._options.WebSocket).toBe(_WebSocket)
      expect(instanceUrl._options.EventEmitter).toBe(EventEmitter)
      expect(instanceUrl._options.log).toBeInstanceOf(Function)

      const instanceAutoPing = new KrakenWSPublic({ autoPing: true })
      expect(instanceAutoPing._options).toEqual(
        expect.objectContaining({
          ...defaultOptions,
          autoPing: true,
        })
      )
      expect(instanceAutoPing._options.WebSocket).toBe(_WebSocket)
      expect(instanceAutoPing._options.EventEmitter).toBe(EventEmitter)
      expect(instanceAutoPing._options.log).toBeInstanceOf(Function)

      const instanceMaxListeners = new KrakenWSPublic({
        eventEmitterMaxListeners: 1000,
      })
      expect(instanceMaxListeners._options).toEqual(
        expect.objectContaining({
          ...defaultOptions,
          eventEmitterMaxListeners: 1000,
        })
      )
      expect(instanceMaxListeners._options.WebSocket).toBe(_WebSocket)
      expect(instanceMaxListeners._options.EventEmitter).toBe(EventEmitter)
      expect(instanceMaxListeners._options.log).toBeInstanceOf(Function)

      const instanceRetryCount = new KrakenWSPublic({ retryCount: 10 })
      expect(instanceRetryCount._options).toEqual(
        expect.objectContaining({
          ...defaultOptions,
          retryCount: 10,
        })
      )
      expect(instanceRetryCount._options.WebSocket).toBe(_WebSocket)
      expect(instanceRetryCount._options.EventEmitter).toBe(EventEmitter)
      expect(instanceRetryCount._options.log).toBeInstanceOf(Function)

      const instanceRetryDelay = new KrakenWSPublic({ retryDelay: 1000 })
      expect(instanceRetryDelay._options).toEqual(
        expect.objectContaining({
          ...defaultOptions,
          retryDelay: 1000,
        })
      )
      expect(instanceRetryDelay._options.WebSocket).toBe(_WebSocket)
      expect(instanceRetryDelay._options.EventEmitter).toBe(EventEmitter)
      expect(instanceRetryDelay._options.log).toBeInstanceOf(Function)

      const instanceMaxReconnects = new KrakenWSPublic({ maxReconnects: 10 })
      expect(instanceMaxReconnects._options).toEqual(
        expect.objectContaining({
          ...defaultOptions,
          maxReconnects: 10,
        })
      )
      expect(instanceMaxReconnects._options.WebSocket).toBe(_WebSocket)
      expect(instanceMaxReconnects._options.EventEmitter).toBe(EventEmitter)
      expect(instanceMaxReconnects._options.log).toBeInstanceOf(Function)
    })

    it('should initialize an empty subscriptions state', () => {
      const instance = new KrakenWSPublic()
      expect(instance.subscriptions).toEqual({
        ticker: {},
        trade: {},
        spread: {},
        ohlc: {},
        book: {},
      })
    })
  })

  describe('subscribe', () => {
    let instance

    beforeEach(() => {
      instance = new KrakenWSPublic({ url, WebSocket })
    })

    it('should reject when no pair is provided', () => {
      const request = instance.subscribe(undefined, 'name', {})
      return expect(request).rejects.toThrow(
        "You need to provide 'pair' when subscribing"
      )
    })

    it('should reject when no name is provided', () => {
      const request = instance.subscribe('XBT/EUR', undefined, {})
      return expect(request).rejects.toThrow(
        "You need to provide 'name' when subscribing"
      )
    })

    it('should reject when no options are provided', () => {
      const request = instance.subscribe('XBT/EUR', 'name')
      return expect(request).rejects.toThrow(
        "You need to provide 'options' when subscribing"
      )
    })

    it('should reject when options is not an object', () => {
      const request = instance.subscribe('XBT/EUR', 'name', 42)
      return expect(request).rejects.toThrow('"options" needs to be an object')
    })

    it('should reject when the name is not a valid public name', () => {
      const request = instance.subscribe('XBT/EUR', 'name', {})
      return expect(request).rejects.toThrow(
        `Invalid name. Valid names are: 'ticker', 'ohlc', 'trade', 'spread', 'book'. Received 'name'`
      )
    })

    it('should reject when there is no connection', () => {
      const request = instance.subscribe('XBT/EUR', 'ticker', {})
      return expect(request).rejects.toThrow('Not connected to the websocket')
    })

    it('should reject when already subscribed', async () => {
      await instance.connect()
      instance.subscriptions.ticker['XBT/EUR'] = true
      const request = instance.subscribe('XBT/EUR', 'ticker', {})
      return expect(request).rejects.toThrow('already subscribed')
    })

    it('should reject when subscription fails for some reason', async () => {
      await instance.connect()

      client.on('message', message => {
        const msg = JSON.parse(message)

        if (msg.event !== 'subscribe') return
        if (msg.subscription.name !== 'spread') return

        const response = createEmitSubscriptionStatusSpreadError({
          errorMessage: 'Custom',
          reqid: msg.reqid,
          pair: msg.pair,
        })

        client.send(JSON.stringify(response))
      })

      const request = instance.subscribe('XBT/EUR', 'spread', { reqid: 0 })
      await expect(request).rejects.toEqual(
        expect.objectContaining({
          errorMessage: 'Custom',
        })
      )
    })

    it('should successfully subscribe', async () => {
      await instance.connect()

      client.on('message', message => {
        const msg = JSON.parse(message)

        if (msg.event !== 'subscribe') return
        if (msg.subscription.name !== 'spread') return

        const response = createEmitSubscriptionStatusSpreadSuccess({
          channelID: 0,
          reqid: msg.reqid,
          pair: msg.pair,
        })

        client.send(JSON.stringify(response))
      })

      const request = instance.subscribe('XBT/EUR', 'spread', { reqid: 0 })
      await expect(request).resolves.toEqual(
        expect.objectContaining({
          channelID: 0,
          channelName: 'spread',
        })
      )
    })
  })

  describe('subscribeToTicker', () => {
    let instance

    beforeEach(() => {
      instance = new KrakenWSPublic({ url, WebSocket })
      jest
        .spyOn(instance, 'subscribe')
        .mockImplementation(() => Promise.resolve())
    })

    it('should throw because the pair is missing', () => {
      const throws = () => instance.subscribeToTicker({ reqid: 0 })
      expect(throws).toThrow('Needs pair')
    })

    it('should forward the correct prop to the subscribe method', () => {
      instance.subscribeToTicker({ pair: 'XBT/EUR', reqid: 0 })
      expect(instance.subscribe).toHaveBeenCalledWith('XBT/EUR', 'ticker', {
        reqid: 0,
      })
    })
  })

  describe('subscribeToOHLC', () => {
    let instance

    beforeEach(() => {
      instance = new KrakenWSPublic({ url, WebSocket })
      jest
        .spyOn(instance, 'subscribe')
        .mockImplementation(() => Promise.resolve())
    })

    it('should throw because the pair is missing', () => {
      const throws = () => instance.subscribeToOHLC({})
      expect(throws).toThrow('Needs pair')
    })

    it('should throw the interval because it is undefined', () => {
      const throws = () => instance.subscribeToOHLC({ pair: 'XBT/EUR' })
      expect(throws).toThrow(
        `"interval" must be one of: 1, 5, 15, 30, 60, 240, 1440, 10080, 21600`
      )
    })

    it('should throw the interval because it is not a number', () => {
      const throws = () =>
        instance.subscribeToOHLC({
          pair: 'XBT/EUR',
          interval: 'foo',
        })

      expect(throws).toThrow(
        `"interval" must be one of: 1, 5, 15, 30, 60, 240, 1440, 10080, 21600`
      )
    })

    it('should reject the interval because it is an invalid number', () => {
      const throws = () =>
        instance.subscribeToOHLC({
          pair: 'XBT/EUR',
          interval: 1337,
        })

      expect(throws).toThrow(
        `"interval" must be one of: 1, 5, 15, 30, 60, 240, 1440, 10080, 21600`
      )
    })

    it('should forward the correct prop to the subscribe method', () => {
      instance.subscribeToOHLC({ pair: 'XBT/EUR', interval: 5, reqid: 0 })
      expect(instance.subscribe).toHaveBeenCalledWith('XBT/EUR', 'ohlc', {
        interval: 5,
        reqid: 0,
      })
    })
  })

  describe('subscribeToTrade', () => {
    let instance

    beforeEach(() => {
      instance = new KrakenWSPublic({ url, WebSocket })
      jest
        .spyOn(instance, 'subscribe')
        .mockImplementation(() => Promise.resolve())
    })

    it('should throw because the pair is missing', () => {
      const throws = () => instance.subscribeToTrade({ reqid: 0 })
      expect(throws).toThrow('Needs pair')
    })

    it('should forward the correct prop to the subscribe method', () => {
      instance.subscribeToTrade({ pair: 'XBT/EUR', reqid: 0 })
      expect(instance.subscribe).toHaveBeenCalledWith('XBT/EUR', 'trade', {
        reqid: 0,
      })
    })
  })

  describe('subscribeToSpread', () => {
    let instance

    beforeEach(() => {
      instance = new KrakenWSPublic({ url, WebSocket })
      jest
        .spyOn(instance, 'subscribe')
        .mockImplementation(() => Promise.resolve())
    })

    it('should throw because the pair is missing', () => {
      const throws = () => instance.subscribeToSpread({ reqid: 0 })
      expect(throws).toThrow('Needs pair')
    })

    it('should forward the correct prop to the subscribe method', () => {
      instance.subscribeToSpread({ pair: 'XBT/EUR', reqid: 0 })
      expect(instance.subscribe).toHaveBeenCalledWith('XBT/EUR', 'spread', {
        reqid: 0,
      })
    })
  })

  describe('subscribeToBook', () => {
    let instance

    beforeEach(() => {
      instance = new KrakenWSPublic({ url, WebSocket })
      jest
        .spyOn(instance, 'subscribe')
        .mockImplementation(() => Promise.resolve())
    })

    it('should throw because the pair is missing', () => {
      const throws = () => instance.subscribeToBook({})
      expect(throws).toThrow('Needs pair')
    })

    it('should throw the depth because it is not a number', () => {
      const throws = () =>
        instance.subscribeToBook({
          pair: 'XBT/EUR',
          depth: 'foo',
        })

      expect(throws).toThrow(`"depth" must be one of: 10, 25, 100, 500, 1000`)
    })

    it('should reject the depth because it is an invalid number', () => {
      const throws = () =>
        instance.subscribeToBook({
          pair: 'XBT/EUR',
          depth: 1337,
        })

      expect(throws).toThrow(`"depth" must be one of: 10, 25, 100, 500, 1000`)
    })

    it('should forward the correct prop to the subscribe method with depth', () => {
      instance.subscribeToBook({ pair: 'XBT/EUR', depth: 10, reqid: 0 })
      expect(instance.subscribe).toHaveBeenCalledWith('XBT/EUR', 'book', {
        depth: 10,
        reqid: 0,
      })
    })

    it('should forward the correct prop to the subscribe method without depth', () => {
      instance.subscribeToBook({ pair: 'XBT/EUR', reqid: 0 })
      expect(instance.subscribe).toHaveBeenCalledWith('XBT/EUR', 'book', {
        reqid: 0,
      })
    })
  })

  describe('resubscribe', () => {
    const acceptSubscriptions = cl => {
      cl.on('message', message => {
        const msg = JSON.parse(message)

        if (msg.event !== 'subscribe') return

        if (msg.subscription.name === 'spread') {
          const response = createEmitSubscriptionStatusSpreadSuccess({
            channelID: msg.pair === 'XBT/EUR' ? 0 : 1,
            reqid: msg.reqid,
            pair: msg.pair,
          })

          cl.send(JSON.stringify(response))
        }

        if (msg.subscription.name === 'ticker') {
          const response = createEmitSubscriptionStatusTickerSuccess({
            channelID: msg.pair === 'XBT/EUR' ? 2 : 3,
            reqid: msg.reqid,
            pair: msg.pair,
          })

          cl.send(JSON.stringify(response))
        }

        if (msg.subscription.name === 'trade') {
          const response = createEmitSubscriptionStatusTradeSuccess({
            channelID: msg.pair === 'XBT/EUR' ? 4 : 5,
            reqid: msg.reqid,
            pair: msg.pair,
          })

          cl.send(JSON.stringify(response))
        }

        if (msg.subscription.name === 'ohlc') {
          const response = createEmitSubscriptionStatusOhlcSuccess({
            channelID: msg.pair === 'XBT/EUR' ? 6 : 7,
            reqid: msg.reqid,
            pair: msg.pair,
            interval: msg.subscription.interval,
          })

          cl.send(JSON.stringify(response))
        }

        if (msg.subscription.name === 'book') {
          const response = createEmitSubscriptionStatusBookSuccess({
            channelID: msg.pair === 'XBT/EUR' ? 8 : 9,
            reqid: msg.reqid,
            pair: msg.pair,
            depth: msg.subscription.depth,
          })

          cl.send(JSON.stringify(response))
        }
      })
    }

    it('should resubscribe to exiting subscriptions on reconnect', async () => {
      const instance = new KrakenWSPublic({ url, WebSocket, retryDelay: 1 })
      jest.spyOn(instance, 'subscribe')
      await instance.connect()
      acceptSubscriptions(client)

      await instance.subscribeToSpread({ pair: 'XBT/EUR' })
      await instance.subscribeToTrade({ pair: 'XBT/EUR' })
      await instance.subscribeToOHLC({ pair: 'XBT/EUR', interval: 5 })
      await instance.subscribeToBook({ pair: 'XBT/EUR', depth: 10 })
      await instance.subscribeToTicker({ pair: 'XBT/EUR' })
      await instance.subscribeToSpread({ pair: 'XBT/USD' })
      await instance.subscribeToTrade({ pair: 'XBT/USD' })
      await instance.subscribeToOHLC({ pair: 'XBT/USD', interval: 5 })
      await instance.subscribeToBook({ pair: 'XBT/USD', depth: 10 })
      await instance.subscribeToTicker({ pair: 'XBT/USD' })

      const connectedPromise = new Promise(resolve => {
        instance.on('kraken:connection:established', resolve)
      })

      server.close()
      server.stop()

      const subscriptionPromise = new Promise(resolve => {
        let counter = 0
        const off = instance.on('kraken:subscribe:success', () => {
          counter++

          if (counter === 10) {
            off()
            resolve()
          }
        })
      })

      server = new Server(url)
      server.on('connection', socket => acceptSubscriptions(socket))

      await connectedPromise
      await subscriptionPromise

      expect(instance.subscribe).toHaveBeenCalledTimes(20)

      // original calls
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        1,
        'XBT/EUR',
        'spread',
        { reqid: undefined }
      )
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        2,
        'XBT/EUR',
        'trade',
        { reqid: undefined }
      )
      expect(instance.subscribe).toHaveBeenNthCalledWith(3, 'XBT/EUR', 'ohlc', {
        interval: 5,
        reqid: undefined,
      })
      expect(instance.subscribe).toHaveBeenNthCalledWith(4, 'XBT/EUR', 'book', {
        depth: 10,
        reqid: undefined,
      })
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        5,
        'XBT/EUR',
        'ticker',
        { reqid: undefined }
      )
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        6,
        'XBT/USD',
        'spread',
        { reqid: undefined }
      )
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        7,
        'XBT/USD',
        'trade',
        { reqid: undefined }
      )
      expect(instance.subscribe).toHaveBeenNthCalledWith(8, 'XBT/USD', 'ohlc', {
        interval: 5,
        reqid: undefined,
      })
      expect(instance.subscribe).toHaveBeenNthCalledWith(9, 'XBT/USD', 'book', {
        depth: 10,
        reqid: undefined,
      })
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        10,
        'XBT/USD',
        'ticker',
        { reqid: undefined }
      )

      // resubscription calls
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        11,
        'XBT/EUR',
        'ticker',
        { reqid: undefined, reconnect: true }
      )
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        12,
        'XBT/USD',
        'ticker',
        { reqid: undefined, reconnect: true }
      )
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        13,
        'XBT/EUR',
        'trade',
        { reqid: undefined, reconnect: true }
      )
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        14,
        'XBT/USD',
        'trade',
        { reqid: undefined, reconnect: true }
      )
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        15,
        'XBT/EUR',
        'spread',
        { reqid: undefined, reconnect: true }
      )
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        16,
        'XBT/USD',
        'spread',
        { reqid: undefined, reconnect: true }
      )
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        17,
        'XBT/EUR',
        'ohlc',
        { interval: 5, reqid: undefined, reconnect: true }
      )
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        18,
        'XBT/USD',
        'ohlc',
        { interval: 5, reqid: undefined, reconnect: true }
      )
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        19,
        'XBT/EUR',
        'book',
        { depth: 10, reqid: undefined, reconnect: true }
      )
      expect(instance.subscribe).toHaveBeenNthCalledWith(
        20,
        'XBT/USD',
        'book',
        { depth: 10, reqid: undefined, reconnect: true }
      )
    })
  })
})
