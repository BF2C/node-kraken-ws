import EventEmitter from 'events'
import { Server, WebSocket } from 'mock-socket'
import { handleHeartbeat } from '../handleHeartbeat'
import { handlePong } from '../handlePong'
import { handleSystemStatus } from '../handleSystemStatus'
import { handleUnhandled } from '../handleUnhandled'
import { KrakenWS } from '../KrakenWS'

describe('KrakenWS', () => {
  let server
  const url = 'ws://url.com'

  beforeEach(() => {
    server = new Server(url)
  })

  afterEach(() => {
    server.stop()
  })

  describe('constructor', () => {
    it('should start with a next reqId of 0', () => {
      const instance = new KrakenWS()
      expect(instance._nextReqid).toBe(0)
    })

    it('should start with no connection', () => {
      const instance = new KrakenWS()
      expect(instance._connection).toBe(null)
    })

    it('should start with a cur reconnect of 0', () => {
      const instance = new KrakenWS()
      expect(instance._curReconnect).toBe(0)
    })

    it('should start with the default options', () => {
      const instance = new KrakenWS({ WebSocket })
      expect(instance._options).toEqual(
        expect.objectContaining({
          retryCount: 5,
          retryDelay: 100,
          eventEmitterMaxListeners: 100,
          autoPing: false,
          maxReconnects: Infinity,
        })
      )

      expect(instance._options.EventEmitter).toBe(EventEmitter)
      expect(instance._options.WebSocket).toBe(WebSocket)
      expect(instance._options.log).toBeInstanceOf(Function)
    })

    it('should merge the options with the default options', () => {
      const instance = new KrakenWS({
        retryCount: 6,
        WebSocket,
        EventEmitter,
      })

      expect(instance._options).toEqual(
        expect.objectContaining({
          retryCount: 6,
          retryDelay: 100,
          eventEmitterMaxListeners: 100,
          autoPing: false,
          maxReconnects: Infinity,
        })
      )

      expect(instance._options.EventEmitter).toBe(EventEmitter)
      expect(instance._options.WebSocket).toBe(WebSocket)
      expect(instance._options.log).toBeInstanceOf(Function)
    })

    it('should call the log function', () => {
      const log = jest.fn()
      new KrakenWS({ log })

      expect(log).toHaveBeenNthCalledWith(1, {
        message: 'KrakenWS :: Constructing Kraken WS instance',
        level: 'info',
        additional: {
          options: expect.objectContaining({
            retryCount: 5,
            retryDelay: 100,
            EventEmitter,
            eventEmitterMaxListeners: 100,
            autoPing: false,
            maxReconnects: Infinity,
          }),
        },
      })
    })

    it('should create a new event handler instance', () => {
      const instance = new KrakenWS()
      expect(instance._eventHandler).toBeInstanceOf(EventEmitter)
    })

    it('should call the setMaxListeners method with the default optios value of 100', () => {
      const setMaxListeners = jest.fn()
      const Emitter = class Emitter {
        constructor() {
          this.setMaxListeners = setMaxListeners
        }
        on() {}
      }
      new KrakenWS({
        EventEmitter: Emitter,
      })

      expect(setMaxListeners).toHaveBeenCalledWith(100)
    })

    it('should set the 4 message handlers', () => {
      const instance = new KrakenWS()
      expect(instance.socketMessageHandlers).toEqual([
        handleUnhandled,
        handleSystemStatus,
        handleHeartbeat,
        handlePong,
      ])
    })

    it('should start with 0 subscriptions', () => {
      const instance = new KrakenWS()
      expect(instance.subscriptions).toEqual({})
    })
  })

  describe('_emit', () => {
    it('should log an emit', () => {
      const log = jest.fn()
      const instance = new KrakenWS({ log })
      log.mockClear()

      instance._emit(1, 2, 3)
      expect(log).toHaveBeenCalledWith({
        level: 'info',
        message: 'KrakenWS :: emit',
        additional: [1, 2, 3],
      })
    })

    it('should forward the emit to the event handler', () => {
      const emit = jest.fn()
      const Emitter = class Emitter {
        constructor() {
          this.emit = emit
          this.on = jest.fn()
        }
      }

      const instance = new KrakenWS({ EventEmitter: Emitter })
      expect(emit).toHaveBeenCalledTimes(0)

      instance._emit(1, 2, 3)
      expect(emit).toHaveBeenCalledTimes(1)
      expect(emit).toHaveBeenCalledWith(1, 2, 3)
    })
  })

  describe('on', () => {
    const callback = jest.fn()
    const log = jest.fn()
    const emit = jest.fn()
    const on = jest.fn()
    const removeListener = jest.fn()
    const Emitter = class {
      constructor() {
        this.emit = emit
        this.on = on
        this.removeListener = removeListener
      }
    }
    let instance

    beforeEach(() => {
      instance = new KrakenWS({ log, EventEmitter: Emitter })
      log.mockClear()
      emit.mockClear()
      on.mockClear()
      removeListener.mockClear()
      callback.mockClear()
    })

    it('should log the event registration', () => {
      instance.on('foo', callback, 1, 2, 3)
      expect(log).toHaveBeenCalledWith({
        level: 'info',
        message: 'KrakenWS :: on',
        additional: {
          events: ['foo'],
          additionalArgs: [1, 2, 3],
        },
      })
    })

    it('should forward the event, callback and args to the emitter', () => {
      instance.on('foo', callback, 1, 2, 3)
      expect(on).toHaveBeenCalledWith('foo', callback, 1, 2, 3)
    })

    it('should call the removeListener once when calling the returned function', () => {
      const off = instance.on('foo', callback, 1, 2, 3)
      expect(removeListener).toHaveBeenCalledTimes(0)
      off()
      expect(removeListener).toHaveBeenCalledTimes(1)
      expect(removeListener).toHaveBeenCalledWith('foo', callback)
    })

    it('should register multiple events', () => {
      instance.on('foo bar baz', callback, 1, 2, 3)
      expect(on).toHaveBeenCalledTimes(3)
      expect(on).toHaveBeenNthCalledWith(1, 'foo', callback, 1, 2, 3)
      expect(on).toHaveBeenNthCalledWith(2, 'bar', callback, 1, 2, 3)
      expect(on).toHaveBeenNthCalledWith(3, 'baz', callback, 1, 2, 3)
    })

    it('should unregister multiple events', () => {
      const off = instance.on('foo bar baz', callback, 1, 2, 3)
      expect(removeListener).toHaveBeenCalledTimes(0)
      off()
      expect(removeListener).toHaveBeenCalledTimes(3)
      expect(removeListener).toHaveBeenNthCalledWith(1, 'foo', callback)
      expect(removeListener).toHaveBeenNthCalledWith(2, 'bar', callback)
      expect(removeListener).toHaveBeenNthCalledWith(3, 'baz', callback)
    })
  })

  describe('connect', () => {
    it('should connect successfully', async () => {
      const instance = new KrakenWS({
        url,
        WebSocket,
        retryDelay: 0,
      })
      const request = instance.connect()
      await expect(request).resolves.toBeInstanceOf(WebSocket)
    })

    it('should reject when connecting fails', async () => {
      const instance = new KrakenWS({
        url,
        WebSocket,
        retryDelay: 0,
        retryCount: 0,
      })

      server.close()
      const request = instance.connect()

      await expect(request).rejects.toThrow(
        'Connection refused, retryCount is 0'
      )
    })

    it('should try reconnecting several times', async () => {
      const instance = new KrakenWS({
        url,
        WebSocket,
        retryDelay: 0,
        retryCount: 5,
      })

      server.close()
      const request = instance.connect()

      await expect(request).rejects.toThrow('Max retrys of "5" reached')
    })

    it('should reconnect two times', async () => {
      let errorCounter = 0
      const instance = new KrakenWS({
        url,
        WebSocket,
        maxReconnects: 2,
      })

      server.on('connection', () => {
        if (errorCounter === 2) return
        errorCounter++
        server.simulate('error')
      })

      instance.connect()

      let successCounter = 0
      await new Promise(resolve => {
        instance.on('kraken:connection:established', () => {
          successCounter++
          if (successCounter === 3) {
            resolve()
          }
        })
      })

      await expect(instance.isConnected()).resolves.toBe()
    })

    it('should not reconnect when maxReconnects limit is hit', async () => {
      const errorCounter = 0
      const instance = new KrakenWS({
        url,
        WebSocket,
        maxReconnects: 2,
      })

      server.on('connection', () => {
        if (errorCounter === 3) return
        server.simulate('error')
      })

      instance.connect()

      let successCounter = 0
      await new Promise(resolve => {
        instance.on('kraken:connection:established', () => {
          successCounter++
          if (successCounter === 3) {
            resolve()
          }
        })
      })

      await expect(instance.isConnected()).rejects.toBe()
    })
  })

  describe('disconnect', () => {
    it('should successfully disconnect', async () => {
      const instance = new KrakenWS({
        url,
        WebSocket,
        retryDelay: 0,
      })

      await expect(instance.connect()).resolves.toBeInstanceOf(WebSocket)
      await expect(instance.disconnect()).resolves.toEqual({ closed: true })
      await expect(instance.isConnected()).rejects.toBe()
    })

    it('should successfully disconnect', async () => {
      const instance = new KrakenWS({
        url,
        WebSocket,
        retryDelay: 0,
      })

      await expect(instance.connect()).resolves.toBeInstanceOf(WebSocket)
      await expect(instance.disconnect()).resolves.toEqual({ closed: true })
      await expect(instance.isConnected()).rejects.toBe()
      await expect(instance.disconnect()).resolves.toEqual({ closed: false })
      await expect(instance.isConnected()).rejects.toBe()
    })
  })

  describe('_retryTimeout', () => {
    beforeAll(() => {
      jest.useFakeTimers()
    })

    afterAll(() => {
      jest.useRealTimers()
    })

    it('should resolve after the retryDelay time', async () => {
      const stub = jest.fn()
      const instance = new KrakenWS({ retryDelay: 100 })
      const promise = instance._retryTimeout().then(stub)

      jest.advanceTimersByTime(50)
      await Promise.resolve() // run callbacks stored in microtask queue
      expect(stub).toHaveBeenCalledTimes(0)

      jest.advanceTimersByTime(50)
      await Promise.resolve() // run callbacks stored in microtask queue
      expect(stub).toHaveBeenCalledTimes(1)

      await expect(promise).resolves.toBe(undefined)
    })

    it('should reject when the connection has been terminated internally', async () => {
      const stub = jest.fn()
      const instance = new KrakenWS({ retryDelay: 100 })
      const promise = instance._retryTimeout().then(stub)

      jest.advanceTimersByTime(50)
      await Promise.resolve() // run callbacks stored in microtask queue
      expect(stub).toHaveBeenCalledTimes(0)

      instance._emit('internal:connection:disconnected-manually')

      await expect(promise).rejects.toBe(undefined)
    })
  })

  describe('send', () => {
    it('should send the message to the server', async () => {
      const payload = { foo: 'foo' }
      const result = new Promise(resolve => {
        server.on('connection', socket => {
          socket.on('message', message => {
            resolve(JSON.parse(message))
          })
        })
      })

      const instance = new KrakenWS({ url, WebSocket })
      const connectionRequest = instance.connect()
      await expect(connectionRequest).resolves.toBeInstanceOf(WebSocket)

      instance.send(payload)
      await expect(result).resolves.toEqual(payload)
    })

    it('should throw an error when there is no connection', () => {
      const instance = new KrakenWS({ url, WebSocket })
      expect(() => instance.send({ fo: 'foo' })).toThrow(
        "You can't send a message without an established websocket connection"
      )
    })
  })

  describe('ping', () => {
    it('should respond with a pong', async () => {
      server.on('connection', socket => {
        socket.on('message', message => {
          const parsed = JSON.parse(message)

          if (parsed.event === 'ping') {
            const { reqid } = parsed
            const response = JSON.stringify({ event: 'pong', reqid })
            socket.send(response)
          }
        })
      })

      const instance = new KrakenWS({ url, WebSocket })
      const connectionRequest = instance.connect()
      await expect(connectionRequest).resolves.toBeInstanceOf(WebSocket)
      await expect(instance.ping()).resolves.toEqual({ reqid: 0 })
      await expect(instance.ping({ reqid: 123 })).resolves.toEqual({
        reqid: 123,
      })
    })
  })

  describe('handleMessage', () => {
    it('should emit an error if the event data is not valid json', async () => {
      const instance = new KrakenWS({ url, WebSocket })
      const promise = new Promise(resolve => {
        instance.on('kraken:error', resolve)
      })

      instance.handleMessage({ data: 'a string' })

      await expect(promise).resolves.toEqual({
        errorMessage: 'Error parsing the payload',
        data: undefined,
        error: expect.any(SyntaxError),
      })
    })

    it('should call the fake handlers with the parsed event data', () => {
      const fakeHandler = jest.fn()
      const instance = new KrakenWS({ url, WebSocket })
      instance.socketMessageHandlers = [
        ...instance.socketMessageHandlers,
        fakeHandler,
      ]

      const event = { data: JSON.stringify({ name: 'foo' }) }
      instance.handleMessage(event)
      expect(fakeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          event,
          payload: { name: 'foo' },
        })
      )
    })

    it('should emit once for every handler that returns an emit payload', async () => {
      const instance = new KrakenWS({ url, WebSocket })

      const fakeHandlerOne = jest.fn(({ payload }) => {
        if (payload.name === 'foo') return { name: 'kraken:foo', payload: 42 }
      })
      const fakeHandlerTwo = jest.fn(({ payload }) => {
        if (payload.name === 'foo') return { name: 'kraken:bar', payload: 1337 }
      })
      instance.socketMessageHandlers = [
        ...instance.socketMessageHandlers,
        fakeHandlerOne,
        fakeHandlerTwo,
      ]

      const promise = new Promise(resolve => {
        let foo = false,
          bar = false

        instance.on('kraken:foo', () => {
          foo = true
          if (bar) resolve({ foo, bar })
        })

        instance.on('kraken:bar', () => {
          bar = true
          if (foo) resolve({ foo, bar })
        })
      })

      const event = { data: JSON.stringify({ name: 'foo' }) }
      instance.handleMessage(event)
      await expect(promise).resolves.toEqual({ foo: true, bar: true })
    })
  })
})
