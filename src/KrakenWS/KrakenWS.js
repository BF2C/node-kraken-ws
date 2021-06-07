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
  autoPing: false,
  eventEmitterMaxListeners: 100,
  retryCount: 5,
  retryDelay: 100, // ms
  maxReconnects: Infinity,
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
    this._curReconnect = 0

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

    this.on('kraken:connection:established', () => {
      if (this._curReconnect === 0) return
      debugKrakenWs('resubscribe')
      this.resubscribe()
    })

    // auto ping
    // @TODO(prevent resubscription)
    // this._options.autoPing && this.autoPing()
  }

  resubscribe() {
    // noop
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
  connect(retryCounter = 0) {
    const debug = debugKrakenWs.extend('connect')

    if (
      this._curReconnect > this._options.maxReconnects &&
      this._curReconnect > 0
    ) {
      debug(
        `connect -> max reconnects reached; ${JSON.stringify({
          curReconnect: this._curReconnect,
          maxReconnects: this._options.maxReconnects,
        })}`
      )

      return Promise.reject(
        new Error(`Max reconnects of "${this._options.maxReconnects}" reached`)
      )
    }

    debug('connect -> start')

    if (this._connection) {
      debug('connect -> already connected')
      return Promise.resolve(this._connection)
    }

    // do not continue if max retry count has been reached
    const isRetrying = this._options.retryCount !== 0 && retryCounter !== 0
    const hasReachedMaxRetryAmount = retryCounter === this._options.retryCount

    if (isRetrying && hasReachedMaxRetryAmount) {
      const err = new Error(
        `Max retrys of "${this._options.retryCount}" reached`
      )

      debug('connect -> reconnecting:error')
      this._emit('kraken:connection:closed')
      this._emit('kraken:connection:reconnecting:error', err)
      this._emit('kraken:connection:error', err)

      return Promise.reject(err)
    }

    this._emit('kraken:connection:establishing')

    const onClose = () => {
      this._connection = null
      debug('connect -> connection:closed')
      this._emit('kraken:connection:closed')

      if (this._options.maxReconnects !== 0) {
        this._connection = null
        debug('connect -> reconnecting:start')
        this._emit('kraken:connection:reconnecting:start')
        this._curReconnect += 1

        // ignore failure => retry happens automatically
        this.connect().catch(() => null)
      }
    }

    const onFailure = () => {
      // change state to reconnecting during first
      if (!this._options.retryCount) {
        const err = new Error('Connection refused, retryCount is 0')

        this._connection = null
        debug('connect -> connection:noretry')
        this._emit('kraken:connection:noretry', err)
        this._emit('kraken:connection:error', err)

        throw err
      }

      if (retryCounter !== 0) {
        debug(
          `connect -> reconnecting:continue; ${JSON.stringify({
            counter: retryCounter + 1,
          })}`
        )

        this._emit('kraken:connection:reconnecting:continue', {
          counter: retryCounter + 1,
        })
      }

      return this._retryTimeout().then(() => this.connect(retryCounter + 1))
    }

    return this._establishConnection({ onClose })
      .then(_payload => {
        this._emit('kraken:connection:established', _payload)
        return _payload
      })
      .catch(error => onFailure(error))
  }

  /**
   * @returns {Promise.<void>}
   */
  disconnect() {
    // So we can interrup the retry process
    this._emit('internal:connection:disconnected-manually')

    // close connection if open
    if (this._connection) {
      this._connection.close()

      return new Promise(resolve => {
        const unsubscribe = this.on('kraken:connection:closed', () => {
          this._connection = null
          unsubscribe()
          resolve({ closed: true })
        })
      })
    }

    return Promise.resolve({ closed: false })
  }

  _retryTimeout() {
    return new Promise((resolve, reject) => {
      const unsubscribe = this.on(
        'internal:connection:disconnected-manually',
        () => {
          if (!this._connection) reject()
          unsubscribe()
          clearTimeout(timeoutID)
          reject()
        }
      )

      const timeoutID = setTimeout(() => {
        try {
          unsubscribe()
          resolve()
        } catch (e) {
          console.error(e)
        }
      }, this._options.retryDelay)
    })
  }

  /**
   * @param {Object} message
   * @returns {void}
   */
  send(message) {
    if (!this._connection) {
      debugKrakenWs('Trying to send a message with closed connection')

      throw new Error(
        "You can't send a message without an established websocket connection"
      )
    }

    const payload = JSON.stringify(message)
    debugKrakenWs(`Send message: ${JSON.stringify(message)}`)

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

    try {
      payload = JSON.parse(event.data)
    } catch (event) {
      debugKrakenWs(
        `handleMessage :: Error parsing the payload: ${JSON.stringify(event)}`
      )

      return this._emit('kraken:error', {
        errorMessage: 'Error parsing the payload',
        data: event.data,
        error: event,
      })
    }

    debugKrakenWs(
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
      debugKrakenWs(`Generated emits for message: ${JSON.stringify(allEmits)}`)
      allEmits.forEach(({ name, payload }) => this._emit(name, payload))
    } else {
      debugKrakenWs('No emits for generated')
      this._emit('kraken:unhandled', payload)
    }
  }

  _establishConnection({ onClose }) {
    return new Promise((resolve, reject) => {
      debugKrakenWs(`establish connection (${this._options.url})`)

      const ws = new this._options.WebSocket(this._options.url)
      this._connection = null

      ws.onopen = () => {
        debugKrakenWs(`establish connection :: success (${this._options.url})`)
        this._connection = ws
        resolve(ws)
      }

      ws.onerror = error => {
        debugKrakenWs(
          `establish connection :: failure; ${JSON.stringify({
            url: this._options.url,
            error: error,
          })}`
        )

        if (this._connection) {
          this._connection = null
          onClose && onClose()
        } else {
          reject(error)
        }
      }

      ws.onclose = () => {
        if (!this._connection) return

        debugKrakenWs(`establish connection :: closed (${this._options.url})`)

        this._connection = null
        onClose && onClose()
      }

      ws.onmessage = this.handleMessage.bind(this)
    })
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
