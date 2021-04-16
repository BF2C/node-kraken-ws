import WebSocket from 'ws'
import EventEmitter from 'events'

import { isValidPublicName } from './isValidPublicName'
import { isValidPrivateName } from './isValidPrivateName'
import { handlePong } from './handlePong'
import { handleHeartbeat } from './handleHeartbeat'
import { handleUnhandled } from './handleUnhandled'
import { handleSystemStatus } from './handleSystemStatus'

const DEFAULT_OPTIONS = {
  EventEmitter, // Event handler for composition
  WebSocket, // web socket class
  autoPing: true,
  eventEmitterMaxListeners: 100,
  log: () => undefined,
  maxReconnects: Infinity,
  retryCount: 5,
  retryDelay: 100, // ms
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
    // "private" properties
    this._options = { ...DEFAULT_OPTIONS, ...options }
    this._connection = null
    this._nextReqid = 0
    this._curReconnect = 0

    this.log({
      message: 'Constructing Kraken WS instance',
      additional: { options: this._options },
    })

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

    this.on('kraken:connection:established', () => this.log({ message: 'resubscribe' }))

    // auto ping
    // @TODO(prevent resubscription)
    // this._options.autoPing && this.autoPing()
  }

  /**
   * Forwards all arguments to the event handler
   */
  _emit = (...args) => {
    this.log({ message: 'emit', additional: args })
    return this._eventHandler.emit(...args)
  }

  on(eventStr, callback, ...args) {
    const events = eventStr.split(' ')
    this.log({ message: 'on', additional: { events, additionalArgs: args }})
    events.map(event => this._eventHandler.on(event, callback, ...args))
    
    return () => {
      this.log({ message: 'off', additional: { events }})

      events.forEach(
        event => this._eventHandler.removeListener(event, callback)
      )
    }
  }

  isConnected = () => {
    return !!this._connection
  }

  /**
   * @param {Int} retryCounter
   * Does not need to be supplied, internal only
   *
   * @return {Promise.<void>}
   */
  connect = (retryCounter = 0) => {
    if (this._curReconnect >= this._options.maxReconnects) {
      this.log({
        message: 'connect -> max reconnects reached',
        additional: {
          curReconnect: this._curReconnect,
          maxReconnects: this._options.maxReconnects,
        },
      })

      return Promise.reject(new Error('max reconnects reached'))
    }

    this.log({ message: 'connect -> start' })

    if (this._connection) {
      this.log({ message: 'connect -> already connected' })
      return Promise.resolve(this._connection)
    }

    // do not continue if max retry count has been reached
    const isRetrying = this._options.retryCount !== 0 && retryCounter !== 0
    const hasReachedMaxRetryAmount = retryCounter === this._options.retryCount

    if (isRetrying && hasReachedMaxRetryAmount) {
      this.log({ message: 'connect -> reconnecting:failure' })
      this._emit('kraken:connection:closed')
      this._emit('kraken:connection:reconnecting:failure')
      return
    }

    this._emit('kraken:connection:establishing')

    const onClose = () => {
      this._connection = null
      this.log({ message: 'connect -> connection:closed' })
      this._emit('kraken:connection:closed')

      if (this._options.retryCount !== 0) {
        this._connection = null
        this.log({ message: 'connect -> reconnecting:start' })
        this._emit('kraken:connection:reconnecting:start')
        this.connect(0)
        return
      }
    }

    const onFailure = () => {
      // change state to reconnecting during first
      if (!this._options.retryCount) {
        this._connection = null
        this.log({ message: 'connect -> connection:noretry' })
        this._emit('kraken:connection:noretry')
        return
      }

      if (retryCounter !== 0) {
        this.log({
          message: 'connect -> reconnecting:continue',
          additional: { counter: retryCounter + 1 },
        })

        this._emit(
          'kraken:connection:reconnecting:continue',
          { counter: retryCounter + 1 }
        )
      }

      this._retryTimeout()
        .then(() => this.connect(retryCounter + 1))
    }

    return this._establishConnection({ onClose })
      .then(_payload => {
        this._curReconnect += 1
        this._emit('kraken:connection:established', _payload)
        return _payload
      })
      .catch(() => onFailure())
  }

  /**
   * @returns {Promise.<void>}
   */
  disconnect = () => {
    // So we can interrup the retry process
    this._emit('internal:connection:disconnected-manually')

    // close connection if open
    if (this._connection) {
      this._connection.close()

      return new Promise(resolve => {
        const unsubscribe = this.on('kraken:connection:closed', () => {
          this._connection = null
          unsubscribe()
          resolve()
        })
      })
    }

    return Promise.resolve()
  }

  _retryTimeout = () => new Promise((resolve, reject) => {
    let timeoutID

    const unsubscribe = this.on('internal:connection:disconnected-manually', () => {
      if (!this._connection) reject()
      unsubscribe()
      clearTimeout(timeoutID)
    })

    timeoutID = setTimeout(() => {
      unsubscribe()
      resolve()
    }, this._options._retryTimeout)
  })

  /**
   * @param {Object} message
   * @returns {void}
   */
  send = message => {
    if (!this._connection) {
      this.log({
        message: 'Trying to send a message with closed connection'
      })

      throw new Error("You can't send a message without an established websocket connection")
    }

    const payload = JSON.stringify(message)

    this.log({
      message: 'Send message',
      additional: { payload: message },
    })

    this._connection.send(payload)
  }

  /**
   * @param {Object} [options]
   * @param {Int} [options.reqid]
   * @returns {Promise}
   */
  ping = ({ reqid } = {}) => new Promise(resolve => {
    const nextReqid = reqid || this._nextReqid++

    const unsubscribe = this.on('kraken:pong', payload => {
      if (payload.reqid !== nextReqid) return
      unsubscribe()
      resolve(payload)
    })

    this.log({ message: 'ping', additional: { reqid }})
    this.send({ event: 'ping', reqid: reqid })
  })
  
  /**
   * @param {string} e
   * @returns {void}
   */
  handleMessage = event => {
    let payload

    try {
      payload = JSON.parse(event.data);
    } catch (event) {
      this.log({
        message: 'handleMessage :: Error parsing the payload',
        level: 'error',
        additional: { payload: event }
      })

      return this._emit('kraken:error', {
        errorMessage: 'Error parsing the payload',
        data: event.data,
        error: event,
      })
    }

    this.log({
      message: 'handleMessage :: Success parsing the payload',
      additional: { payload }
    })

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
      this.log({
        message: 'Generated emits for message',
        additional: { emits: allEmits },
      })

      allEmits.forEach(({ name, payload }) => this._emit(name, payload))
    } else {
      this.log({ message: 'No emits for generated' })
      this._emit('kraken:unhandled', payload)
    }
  }

  _establishConnection = ({ onClose }) => new Promise((resolve, reject) => {
    this.log({
      message: 'establish connection',
      additional: { url: this._options.url },
    })

    const ws = new this._options.WebSocket(this._options.url)
    this._connection = null

    ws.onopen = () => {
      this.log({
        message: 'establish connection :: success',
        additional: { url: this._options.url },
      })
      this._connection = ws
      resolve(ws)
    }

    ws.onerror = error => {
      this.log({
        message: 'establish connection :: failure',
        additional: { url: this._options.url, error: error.message },
      })

      reject(error)
    }

    ws.onclose = () => {
      if (!this._connection) return

      this.log({
        message: 'establish connection :: closed',
        additional: { url: this._options.url },
      })

      this._connection = null
      onClose && onClose()
    }

    ws.onmessage = this.handleMessage
  })

  _handleSubscription = checker => this
    ._handleOneTimeMessageResponse(
      checker,
      'kraken:subscribe:success',
      'kraken:subscribe:failure',
    )
    .then(response => ({
      ...response,
      unsubscribe: () => this.unsubscribe({
        name: repsonse.subscription.name,
      })
    }))

  _handleUnsubscription = checker => this._handleOneTimeMessageResponse(
    checker,
    'kraken:unsubscribe:success',
    'kraken:unsubscribe:failure',
  )

  _handleOneTimeMessageResponse = (checker, successEvent, failureEvent) =>
    new Promise((resolve, reject) => {
      this.log({
        message: 'handleOneTimeMessageResponse :: start',
        additional: { successEvent, failureEvent },
      })

      let unsubscribeSuccess, unsubscribeFailure

      const onResponse = (handler, eventName) => payload => {
        if (!checker(payload)) return

        this.log({
          message: 'handleOneTimeMessageResponse :: onResponse',
          additional: { event: eventName, payload },
        })

        unsubscribeSuccess()
        unsubscribeFailure()
        handler(payload)
      }

      unsubscribeSuccess = this.on(successEvent, onResponse(resolve, successEvent))
      unsubscribeFailure = this.on(failureEvent, onResponse(reject, failureEvent))
    })

  _handleUnsubscription = checker => new Promise((resolve, reject) => {
    this.log({ message: 'handleUnsubscription :: start' })

    let unsubscribeSuccess, unsubscribeFailure

    const onResponse = handler => payload => {
      if (!checker(payload)) return

      this.log({
        message: 'handleUnsubscription :: onResponse',
        additional: { payload },
      })

      unsubscribeSuccess()
      unsubscribeFailure()
      handler(payload)
    }

    unsubscribeSuccess = this.on('kraken:unsubscribe:success', onResponse(resolve))
    unsubscribeFailure = this.on('kraken:unsubscribe:failure', onResponse(reject))
  })

  log({ message, additional, level = 'info', prefix = 'KrakenWS :: ' }) {
    if (this._options.log === DEFAULT_OPTIONS.log) return

    this._options.log({
      message: `${prefix}${message}`,
      level,
      ...(additional ? { additional } : {}),
    })
  }

  autoPing = () => {
    let intervalID = null

    const autoUpdatingSetInterval = (callback, timeout) => {
      this.log({ message: 'autoPing :: autoUpdatingSetInterval called' })

      intervalID = setInterval(() => {
        this.log({ message: 'autoPing :: interval handler' })
        callback()
        autoUpdatingSetInterval()
      }, timeout)
    }

    const disconnectEvents = [
      'kraken:connection:establishing',
      'kraken:connection:failed',
      'kraken:connection:reconnecting:start',
    ]

    const connectEvents = [
      'kraken:connection:established'
    ]

    this.on(disconnectEvents.join(' '), () => {
      if (intervalID) {
        this.log({ message: 'autoPing :: clear interval on disconnect event' })
        clearInterval(intervalID)
      } else {
        this.log({ message: 'autoPing :: could not clear interval as no interval id on close' })
      }
    })

    this.on(connectEvents.join(' '), () => {
      this.log({ message: 'autoPing :: init interval on connect event' })

      autoUpdatingSetInterval(() => {
        const nextReqid = this._nextReqid++
        this.log({ message: 'autoPing :: ping', additional: { reqid: nextReqid } })
        this.ping(nextReqid)
      })
    })
  }
}
