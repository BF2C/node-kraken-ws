import EventEmitter from 'events'
import _WebSocket from 'ws'
import { Server, WebSocket } from 'mock-socket'
import { KrakenWSPrivate } from '../KrakenWSPrivate'
import {
  createEmitSubscriptionStatusOpenOrdersError,
  createEmitSubscriptionStatusOwnTradesSuccess,
  createEmitSubscriptionStatusOpenOrdersSuccess,
} from '../../testing'

describe('KrakenWSPrivate', () => {
  let server, client
  const token = 'token'
  const url = 'ws://private.url.com'

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
    it('should throw when initialized without a token', () => {
      const throws = () => new KrakenWSPrivate({})
      expect(throws).toThrow(
        'You need to provide a token when using the class for accessing private channels'
      )
    })

    it('should set the set options', () => {
      const instance = new KrakenWSPrivate({ token })

      expect(instance._options).toEqual(expect.objectContaining({
        url: 'wss://ws-auth.kraken.com',
        autoPing: false,
        eventEmitterMaxListeners: 100,
        retryCount: 5,
        retryDelay: 100,
        maxReconnects: Infinity,
      }))

      expect(instance._options.WebSocket).toBe(_WebSocket)
      expect(instance._options.EventEmitter).toBe(EventEmitter)
      expect(instance._options.log).toBeInstanceOf(Function)
    })

    it('should overwrite default options with provided options', () => {
      class Foo extends EventEmitter {}

      const defaultOptions = {
        url: 'wss://ws-auth.kraken.com',
        autoPing: false,
        eventEmitterMaxListeners: 100,
        retryCount: 5,
        retryDelay: 100,
        maxReconnects: Infinity,
      }

      const instanceWS = new KrakenWSPrivate({ token, WebSocket })
      expect(instanceWS._options).toEqual(expect.objectContaining(
        defaultOptions
      ))
      expect(instanceWS._options.WebSocket).toBe(WebSocket)
      expect(instanceWS._options.EventEmitter).toBe(EventEmitter)
      expect(instanceWS._options.log).toBeInstanceOf(Function)

      const instanceEE = new KrakenWSPrivate({ token, EventEmitter: Foo })
      expect(instanceEE._options).toEqual(expect.objectContaining(
        defaultOptions
      ))
      expect(instanceEE._options.WebSocket).toBe(_WebSocket)
      expect(instanceEE._options.EventEmitter).toBe(Foo)
      expect(instanceEE._options.log).toBeInstanceOf(Function)

      const instanceUrl = new KrakenWSPrivate({ token, url: 'ws://foo.com' })
      expect(instanceUrl._options).toEqual(expect.objectContaining({
        ...defaultOptions,
        url: 'ws://foo.com',
      }))
      expect(instanceUrl._options.WebSocket).toBe(_WebSocket)
      expect(instanceUrl._options.EventEmitter).toBe(EventEmitter)
      expect(instanceUrl._options.log).toBeInstanceOf(Function)

      const instanceAutoPing = new KrakenWSPrivate({ token, autoPing: true })
      expect(instanceAutoPing._options).toEqual(expect.objectContaining({
        ...defaultOptions,
        autoPing: true,
      }))
      expect(instanceAutoPing._options.WebSocket).toBe(_WebSocket)
      expect(instanceAutoPing._options.EventEmitter).toBe(EventEmitter)
      expect(instanceAutoPing._options.log).toBeInstanceOf(Function)

      const instanceMaxListeners = new KrakenWSPrivate({
        token,
        eventEmitterMaxListeners: 1000,
      })
      expect(instanceMaxListeners._options).toEqual(expect.objectContaining({
        ...defaultOptions,
        eventEmitterMaxListeners: 1000,
      }))
      expect(instanceMaxListeners._options.WebSocket).toBe(_WebSocket)
      expect(instanceMaxListeners._options.EventEmitter).toBe(EventEmitter)
      expect(instanceMaxListeners._options.log).toBeInstanceOf(Function)

      const instanceRetryCount = new KrakenWSPrivate({ token, retryCount: 10 })
      expect(instanceRetryCount._options).toEqual(expect.objectContaining({
        ...defaultOptions,
        retryCount: 10,
      }))
      expect(instanceRetryCount._options.WebSocket).toBe(_WebSocket)
      expect(instanceRetryCount._options.EventEmitter).toBe(EventEmitter)
      expect(instanceRetryCount._options.log).toBeInstanceOf(Function)

      const instanceRetryDelay = new KrakenWSPrivate({ token, retryDelay: 1000 })
      expect(instanceRetryDelay._options).toEqual(expect.objectContaining({
        ...defaultOptions,
        retryDelay: 1000,
      }))
      expect(instanceRetryDelay._options.WebSocket).toBe(_WebSocket)
      expect(instanceRetryDelay._options.EventEmitter).toBe(EventEmitter)
      expect(instanceRetryDelay._options.log).toBeInstanceOf(Function)

      const instanceMaxReconnects = new KrakenWSPrivate({ token, maxReconnects: 10 })
      expect(instanceMaxReconnects._options).toEqual(expect.objectContaining({
        ...defaultOptions,
        maxReconnects: 10,
      }))
      expect(instanceMaxReconnects._options.WebSocket).toBe(_WebSocket)
      expect(instanceMaxReconnects._options.EventEmitter).toBe(EventEmitter)
      expect(instanceMaxReconnects._options.log).toBeInstanceOf(Function)
    })

    it('should initialize an empty subscriptions state', () => {
      const instance = new KrakenWSPrivate({ token })
      expect(instance.subscriptions).toEqual({
        ownTrades: null,
        openOrders: null,
      })
    })
  })

  describe('subscribe', () => {
    let instance

    beforeEach(() => {
      instance = new KrakenWSPrivate({ token, url, WebSocket })
    })

    it('should throw when no name is provided', () => {
      const throws = () => instance.subscribe('', {})
      expect(throws).toThrow('You need to provide "name" when subscribing')
    })

    it('should throw when no token has been provided', () => {
      delete instance._options.token
      const throws = () => instance.subscribe('name', {})
      expect(throws).toThrow('You need to initialize this class with a token if you want to access private streams')
    })

    it('should throw when already subscribed', () => {
      instance.subscriptions.openOrders = true
      const throws = () => instance.subscribe('openOrders', {})
      expect(throws).toThrow(`You've already subscribed to "openOrders"`)
    })

    it('should reject when subscription fails for some reason', async () => {
      await instance.connect()

      client.on('message', message => {
        const msg = JSON.parse(message)

        if (msg.event !== 'subscribe') return
        if (msg.subscription.name !== 'openOrders') return

        const response = createEmitSubscriptionStatusOpenOrdersError({
          errorMessage: 'Custom',
          reqid: msg.reqid,
        })

        client.send(JSON.stringify(response))
      })

      const request = instance.subscribe('openOrders', { reqid: 0 })
      await expect(request).rejects.toEqual(expect.objectContaining({
        errorMessage: 'Custom'
      }))
    })

    it('should successfully subscribe', async () => {
      await instance.connect()

      client.on('message', message => {
        const msg = JSON.parse(message)

        if (msg.event !== 'subscribe') return
        if (msg.subscription.name !== 'openOrders') return

        const response = createEmitSubscriptionStatusOpenOrdersSuccess({
          errorMessage: 'Custom',
          reqid: msg.reqid,
        })

        client.send(JSON.stringify(response))
      })

      const request = instance.subscribe('openOrders', { reqid: 0 })
      await expect(request).resolves.toEqual(expect.objectContaining({
        channelName: 'openOrders'
      }))
    })
  })

  describe('subscribeToOpenOrders', () => {
    let instance

    beforeEach(() => {
      instance = new KrakenWSPrivate({ token, url, WebSocket })
      jest.spyOn(instance, 'subscribe').mockImplementation(
        () => Promise.resolve()
      )
    })

    it('should forward the correct prop to the subscribe method', () => {
      instance.subscribeToOpenOrders({ reqid: 0 })
      expect(instance.subscribe).toHaveBeenCalledWith(
        'openOrders',
        { reqid: 0 }
      )
    })
  })

  describe('subscribeToOwnTrades', () => {
    let instance

    beforeEach(() => {
      instance = new KrakenWSPrivate({ token, url, WebSocket })
      jest.spyOn(instance, 'subscribe').mockImplementation(
        () => Promise.resolve()
      )
    })

    it('should throw when snapshot is provided but not a boolean', () => {
      const throws = () => instance.subscribeToOwnTrades({ snapshot: 42 })
      expect(throws).toThrow('"snapshot" must be a boolean')
    })

    it('should forward the correct prop to the subscribe method', () => {
      instance.subscribeToOwnTrades({ reqid: 0 })
      expect(instance.subscribe).toHaveBeenCalledWith(
        'ownTrades',
        { reqid: 0 }
      )
    })

    it('should forward the snapshot-prop to the subscribe method', () => {
      instance.subscribeToOwnTrades({ reqid: 0, snapshot: true })
      expect(instance.subscribe).toHaveBeenCalledWith(
        'ownTrades',
        { reqid: 0, snapshot: true }
      )
    })
  })

  describe('resubscribe', () => {
    const acceptSubscriptions = cl => {
      cl.on('message', message => {
        const msg = JSON.parse(message)

        if (msg.event !== 'subscribe') return
        let response

        if (msg.subscription.name === 'openOrders') {
          response = createEmitSubscriptionStatusOpenOrdersSuccess({
            reqid: msg.reqid,
          })
        }

        if (msg.subscription.name === 'ownTrades') {
          response = createEmitSubscriptionStatusOwnTradesSuccess({
            reqid: msg.reqid,
          })
        }

        response && cl.send(JSON.stringify(response))
      })
    }

    it('should resubscribe to exiting subscriptions on reconnect', async () => {
      const instance = new KrakenWSPrivate({ url, token, WebSocket, retryDelay: 1 })

      await instance.connect()
      acceptSubscriptions(client)

      await instance.subscribeToOwnTrades()
      await instance.subscribeToOpenOrders()

      const connectedPromise = new Promise(resolve => {
        instance.on('kraken:connection:established', resolve)
      })

      server.close()
      server.stop()

      const subscriptionPromise = new Promise(resolve => {
        let counter = 0
        const off = instance.on('kraken:subscribe:success', () => {
          counter++

          if (counter === 2) {
            off()
            resolve()
          }
        })
      })

      server = new Server(url)
      server.on('connection', socket => acceptSubscriptions(socket))

      await connectedPromise
      await subscriptionPromise
    })
  })
})
