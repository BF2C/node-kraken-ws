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
})
