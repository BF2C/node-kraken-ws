import EventEmitter from 'events'
import WebSocket from 'ws'
import { debug as debugOrig } from '../utils/index'
import { handleHeartbeat } from './handleHeartbeat'
import { handlePong } from './handlePong'
import { handleSystemStatus } from './handleSystemStatus'
import { handleUnhandled } from './handleUnhandled'

const debugKrakenWs = debugOrig.extend('KrakenWS')

const DEFAULT_OPTIONS = {
  EventEmitter, // Event handler for composition
  WebSocket, // web socket class
  eventEmitterMaxListeners: 100,
}

/**
 * @class KrakenWS
 * @prop {Object} subscriptions
 */
export class KrakenWS {
  /**
   * I've used the proposal to use `typeof Class`
   * for some of the types. It is not official,
   * but it's being disucssed, see:
   * https://github.com/jsdoc/jsdoc/issues/1349
   *
   * @constructor
   *
   * @param {Object} options
   *
   * @param {String} options.url
   * Public channels can not be subscribed to on the private channel
   * and vice versa of course
   *
   * @param {Int} [options.retryCount]
   * How many times the socket should try to reconnect.
   *
   * @param {Int} [options.retryDelay]
   * Milliseconds between the retries
   *
   * @param {typeof EventEmitter} [options.EventEmitter]
   * Class to be instantiated as event handler
   * Must follow the api of the EventEmitter class
   *
   * @prop {typeof WebSocket} [options.WebSocket]
   * Class to be instantiated as websocket instance
   * Must follow the api of the WebSocket class provided by the ws npm module
   */
  constructor(options = {}) {
    const debug = debugKrakenWs.extend('constructor')

    // "private" properties
    this._options = { ...DEFAULT_OPTIONS, ...options }
    this._connection = null
    this._nextReqid = 0

    debug(
      `Constructing Kraken WS instance, ${JSON.stringify({
        options: this._options,
      })}`
    )

    // composition over inheritance
    this._eventHandler = new this._options.EventEmitter()

    this._eventHandler.setMaxListeners &&
      this._eventHandler.setMaxListeners(this._options.eventEmitterMaxListeners)

    this.socketMessageHandlers = [
      handleUnhandled,
      handleSystemStatus,
      handleHeartbeat,
      handlePong,
    ]

    // public properties
    this.subscriptions = {}
  }

  async reconnect() {
    await this.disconnect()
    await this.connect()
  }

  /**
   * Forwards all arguments to the event handler
   */
  _emit(...args) {
    const debug = debugKrakenWs.extend('emit')

    debug(`event; ${JSON.stringify(args)}`)
    return this._eventHandler.emit(...args)
  }

  on(eventStr, callback, ...args) {
    const events = eventStr.split(' ')

    events.map(event => {
      debugKrakenWs(`Add event listener for: ${event}`)
      this._eventHandler.on(event, callback, ...args)
    })

    return () => {
      events.forEach(event => {
        debugKrakenWs(`Remove event listener for: ${events.join(', ')}`)
        this._eventHandler.removeListener(event, callback)
      })
    }
  }

  isConnected() {
    return this._connection ? Promise.resolve() : Promise.reject()
  }

  /**
   * @param {Int} retryCounter
   * Does not need to be supplied, internal only
   *
   * @return {Promise.<void>}
   */
  connect() {
    const debug = debugKrakenWs.extend('connect')
    debug('Start connecting')

    if (this._connection) {
      debug('Already connected')
      return Promise.resolve(this._connection)
    }

    this._emit('kraken:connection:establishing')
    return this._establishConnection()
  }

  _establishConnection() {
    const debug = debugKrakenWs.extend('connect')

    return new Promise((resolve, reject) => {
      debug(`Establishing connection with ${this._options.url}`)

      this._connection = null
      const ws = new this._options.WebSocket(this._options.url)

      ws.onopen = () => {
        this._connection = ws
        debug(`Connection established with ${this._options.url}`)
        resolve(ws)
      }

      ws.onerror = error => {
        debug(
          `Failed to establish connection with ${
            this._options.url
          }: ${JSON.stringify({ error })}`
        )

        if (this._connection) {
          this._connection = null
        } else {
          reject(error)
        }
      }

      ws.onclose = () => {
        if (!this._connection) return
        debug(`Connection closed with ${this._options.url}`)
        this._connection = null
        this._emit('kraken:connection:closed')
      }

      ws.onmessage = this.handleMessage.bind(this)
    })
  }

  /**
   * @returns {Promise.<void>}
   */
  disconnect() {
    const debug = debugKrakenWs.extend('connect')

    // So we can interrup the retry process
    this._emit('internal:connection:disconnected-manually')

    // close connection if open
    if (!this._connection) {
      debug('No connection exists')
      return Promise.resolve({ closed: false })
    }

    debug('Close active connection')
    this._connection.close()

    return new Promise(resolve => {
      const unsubscribe = this.on('kraken:connection:closed', () => {
        this._connection = null
        unsubscribe()
        resolve({ closed: true })
      })
    })
  }

  /**
   * @param {Object} message
   * @returns {void}
   */
  send(message) {
    const debug = debugKrakenWs.extend('send')

    if (!this._connection) {
      debug('Trying to send a message with closed connection')

      throw new Error(
        "You can't send a message without an established websocket connection"
      )
    }

    const payload = JSON.stringify(message)
    debug(`Send message: ${JSON.stringify(message)}`)

    this._connection.send(payload)
  }

  /**
   * @param {Object} [options]
   * @param {Int} [options.reqid]
   * @returns {Promise}
   */
  ping({ reqid } = {}) {
    return new Promise(resolve => {
      const nextReqid = reqid || this._nextReqid++

      const unsubscribe = this.on('kraken:pong', payload => {
        if (payload.reqid !== nextReqid) return
        unsubscribe()
        resolve(payload)
      })

      this.send({ event: 'ping', reqid: nextReqid })
    })
  }

  /**
   * @param {string} e
   * @returns {void}
   */
  handleMessage(event) {
    let payload
    const debug = debugKrakenWs.extend('handleMessage')

    try {
      payload = JSON.parse(event.data)
    } catch (event) {
      debug(
        `handleMessage :: Error parsing the payload: ${JSON.stringify(event)}`
      )

      return this._emit('kraken:error', {
        errorMessage: 'Error parsing the payload',
        data: event.data,
        error: event,
      })
    }

    debug(
      `handleMessage :: Success parsing the payload; ${JSON.stringify(payload)}`
    )

    const allEmits = this.socketMessageHandlers.reduce(
      (emitting, inQuestion) => {
        const emits = inQuestion({
          payload,
          event,
          subscriptions: this.subscriptions,
        })

        if (!emits) return emitting

        if (Array.isArray(emits)) {
          return [...emitting, ...emits]
        }

        return [...emitting, emits]
      },
      []
    )

    if (allEmits.length) {
      debug(`Generated emits for message: ${JSON.stringify(allEmits)}`)
      allEmits.forEach(({ name, payload }) => this._emit(name, payload))
    } else {
      debug('No emits for generated')
      this._emit('kraken:unhandled', payload)
    }
  }

  _handleSubscription(checker) {
    return this._handleOneTimeMessageResponse(
      checker,
      'kraken:subscribe:success',
      'kraken:subscribe:error'
    ).then(response => ({
      ...response,
      unsubscribe: () =>
        this.unsubscribe({
          name: response.subscription.name,
        }),
    }))
  }

  _handleOneTimeMessageResponse(checker, successEvent, failureEvent) {
    const debug = debugKrakenWs.extend('handleOneTimeMessageResponse')

    return new Promise((resolve, reject) => {
      debug(
        `start; ${JSON.stringify({
          successEvent,
          failureEvent,
        })}`
      )

      const onResponse = (handler, eventName) => payload => {
        if (!checker(payload)) return

        debug(
          `onResponse; ${JSON.stringify({
            event: eventName,
            payload,
          })}`
        )

        unsubscribeSuccess()
        unsubscribeFailure()
        handler(payload)
      }

      const unsubscribeSuccess = this.on(
        successEvent,
        onResponse(resolve, successEvent)
      )
      const unsubscribeFailure = this.on(
        failureEvent,
        onResponse(reject, failureEvent)
      )
    })
  }

  _handleUnsubscription(checker) {
    const debug = debugKrakenWs.extend('handleUnsubscription')

    return new Promise((resolve, reject) => {
      debug('start')

      const onResponse = handler => payload => {
        if (!checker(payload)) return

        debug(`onResponse: ${JSON.stringify(payload)}`)

        unsubscribeSuccess()
        unsubscribeFailure()
        handler(payload)
      }

      const unsubscribeSuccess = this.on(
        'kraken:unsubscribe:success',
        onResponse(resolve)
      )
      const unsubscribeFailure = this.on(
        'kraken:subscribe:error',
        onResponse(reject)
      )
    })
  }
}
