import EventEmitter from 'events'
import WebSocket from 'ws'
import WS from "jest-websocket-mock";
import { KrakenWS } from '../KrakenWS'
import { handleUnhandled } from '../handleUnhandled'
import { handleSystemStatus } from '../handleSystemStatus'
import { handleHeartbeat } from '../handleHeartbeat'
import { handlePong } from '../handlePong'

describe('KrakenWS', () => {
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
      const instance = new KrakenWS()
      expect(instance._options).toEqual(expect.objectContaining({
        retryCount: 5,
        retryDelay: 100,
        EventEmitter,
        eventEmitterMaxListeners: 100,
        autoPing: true,
        maxReconnects: Infinity,
      }))

      expect(instance._options.EventEmitter).toBe(EventEmitter)
      expect(instance._options.WebSocket).toBe(WebSocket)
      expect(instance._options.log).toBeInstanceOf(Function)
    })

    it('should merge the options with the default options', () => {
      const instance = new KrakenWS({
        retryCount: 6,
      })

      expect(instance._options).toEqual(expect.objectContaining({
        retryCount: 6,
        retryDelay: 100,
        eventEmitterMaxListeners: 100,
        autoPing: true,
        maxReconnects: Infinity,
      }))

      expect(instance._options.EventEmitter).toBe(EventEmitter)
      expect(instance._options.WebSocket).toBe(WebSocket)
      expect(instance._options.log).toBeInstanceOf(Function)
    })

    it('should call the log function', () => {
      const log = jest.fn()
      const instance = new KrakenWS({ log })

      expect(log).toHaveBeenNthCalledWith(1, {
        message: 'KrakenWS :: Constructing Kraken WS instance',
        level: 'info',
        additional: {
          options: expect.objectContaining({
            retryCount: 5,
            retryDelay: 100,
            EventEmitter,
            eventEmitterMaxListeners: 100,
            WebSocket,
            autoPing: true,
            maxReconnects: Infinity,
          })
        }
      })
    })

    it('should create a new event handler instance', () => {
      const instance = new KrakenWS()
      expect(instance._eventHandler).toBeInstanceOf(EventEmitter)
    })

    it('should call the setMaxListeners method with the default optios value of 100', () => {
      const setMaxListeners = jest.fn()
      const Emitter = class Emitter {
        setMaxListeners = setMaxListeners
        on() {}
      }
      const instance = new KrakenWS({
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

    it('should log when the connection has been established', () => {
      const log = jest.fn()
      const instance = new KrakenWS({ log })
      instance._eventHandler.emit('kraken:connection:established')
      expect(log).toHaveBeenNthCalledWith(3, {
        level: 'info',
        message: 'KrakenWS :: resubscribe',
      })
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
        emit = emit
        on = jest.fn()
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
      emit = emit
      on = on
      removeListener = removeListener
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
          additionalArgs: [1, 2, 3]
        }
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
})
