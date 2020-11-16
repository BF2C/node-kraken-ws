import WebSocket from 'ws'
import EventEmitter from 'events'

import { isValidPublicName } from './isValidPublicName'
import { isValidPrivateName } from './isValidPrivateName'
import { handlePong } from './handlePong'
import { handleHeartbeat } from './handleHeartbeat'
import { handleUnhandled } from './handleUnhandled'
import { handleSystemStatus } from './handleSystemStatus'

const DEFAULT_OPTIONS = {
  retryCount: 5,
  retryDelay: 100, // ms
  EventEmitter, // Event handler for composition
  WebSocket, // web socket class
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
  constructor(options) {
    // "private" properties
    this._connection = null
    this._nextReqid = 0
    this._options = { ...DEFAULT_OPTIONS, ...options }

    // composition over inheritance
    this._eventHandler = new this._options.EventEmitter()
    this.socketMessageHandlers = [
      handleUnhandled,
      handleSystemStatus,
      handleHeartbeat,
      handlePong,
    ]

    // public properties
    this.subscriptions = {
      //ownTrades: false,
      //openOrders: false,
    }
  }

  /**
   * Forwards all arguments to the event handler
   */
  _emit = (...args) => this._eventHandler.emit(...args)

  on(event, callback, ...args) {
    this._eventHandler.on(event, callback, ...args)
    return () => this._eventHandler.removeListener(event, callback)
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
    if (this._connection) {
      return Promise.resolve(this._connection)
    }

    // do not continue if max retry count has been reached
    const isRetrying = this._options.retryCount !== 0 && retryCounter !== 0
    const hasReachedMaxRetryAmount = retryCounter === this._options.retryCount

    if (isRetrying && hasReachedMaxRetryAmount) {
      this._emit('kraken:connection:closed')
      this._emit('kraken:connection:reconnecting:failure')
      return
    }

    this._emit('kraken:connection:establishing')

    const onSuccess = ws => {
      this._emit('kraken:connection:established', { ws })
      resolve(ws)
    }

    const onFailure = error => {
      this._emit('kraken:connection:failed', { error })
      reject(e)
    }

    const onClose = () => {
      // change state to reconnecting during first
      if (this._options.retryCount === 0) {
        this._connection = null
        this._emit('kraken:connection:closed')
        return
      }

      if (retryCounter === 0) {
        this._emit('kraken:connection:reconnecting:start')
      }

      this._retryTimeout()
        .then(() => this.connect(retryCounter + 1))
        .catch(() => {})
    }

    return this._establishConnection({
      onSuccess,
      onClose,
      onFailure,
      onMessage: this.handleMessage
    })
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
      throw new Error("You can't send a message without an established websocket connection")
    }

    const payload = JSON.stringify(message)
    this._connection.send(payload)
  }

  _handleSubscription = checker => new Promise((resolve, reject) => {
    let unsubscribeSuccess, unsubscribeFailure

    const onResponse = handler => payload => {
      if (!checker(payload)) return

      unsubscribeSuccess()
      unsubscribeFailure()
      handler(payload)
    }

    unsubscribeSuccess = this.on('kraken:subscribe:success', onResponse(resolve))
    unsubscribeFailure = this.on('kraken:subscribe:failure', onResponse(reject))
  })

  _handleUnsubscription = checker => new Promise((resolve, reject) => {
    let unsubscribeSuccess, unsubscribeFailure

    const onResponse = handler => payload => {
      if (!checker(payload)) return

      unsubscribeSuccess()
      unsubscribeFailure()
      handler(payload)
    }

    unsubscribeSuccess = this.on('kraken:unsubscribe:success', onResponse(resolve))
    unsubscribeFailure = this.on('kraken:unsubscribe:failure', onResponse(reject))
  })

  // /**
  //  * @param {Object} args
  //  * @param {String} args.name
  //  * @param {String} [args.pair]
  //  * @param {Int} [args.reqid]
  //  * @param {Object} [args.options]
  //  * @param {Int} [args.options.depth]
  //  * @param {Int} [args.options.interval]
  //  * @param {String} [args.options.token]
  //  * @returns {Promise.<bool>}
  //  */
  // unsubscribe = ({ pair, name, reqid, options }) => this._withConnection(() => {
  //   if (!name)
  //     return Promise.reject('You need to provide "name" when subscribing')

  //   const isPublic = isValidPublicName(name)

  //   if (isPublic && !pair)
  //     return Promise.reject('You need to provide "pair" when unsubscribing')

  //   //if (isPublic && !this.subscriptions[name][pair])
  //   //  return Promise.reject(`You have not subscribed to "${name}" with pair "${pair}"`)

  //   const nextReqid = reqid || this._nextReqid++
  //   const response = this.send({
  //     event: 'unsubscribe',
  //     reqid: nextReqid,
  //     subscription: { name, ...options },
  //     ...(isPublic ? { pair: [pair] } : {}),
  //   })

  //   const checker = payload =>
  //     payload.reqid === nextReqid &&
  //     // XOR; Either no pair has been provided or
  //     // the provided pair matches the event's pair
  //     !pair ^ payload.pair === pair

  //   return this._handleUnsubscription(checker)
  //     .then(payload => {
  //       delete this.subscriptions[name][pair]
  //       return payload
  //     })
  // })

  _handleUnsubscription = checker => new Promise((resolve, reject) => {
    let unsubscribeSuccess, unsubscribeFailure

    const onResponse = handler => payload => {
      if (!checker(payload)) return

      unsubscribeSuccess()
      unsubscribeFailure()
      handler(payload)
    }

    unsubscribeSuccess = this.on('kraken:unsubscribe:success', onResponse(resolve))
    unsubscribeFailure = this.on('kraken:unsubscribe:failure', onResponse(reject))
  })

  /**
   * @param {Object} [options]
   * @param {Int} [options.reqid]
   * @returns {Promise}
   */
  ping = ({ reqid } = {}) => this._withConnection(() => new Promise(resolve => {
    const nextReqid = reqid || this._nextReqid++

    const unsubscribe = this.on('kraken:pong', payload => {
      if (payload.reqid !== nextReqid) return
      unsubscribe()
      resolve(payload)
    })

    this.send({ event: 'ping', reqid: reqid })
  }))
  
  /**
   * @param {string} e
   * @returns {void}
   */
  handleMessage = event => {
    let payload

    try {
      payload = JSON.parse(event.data);
    } catch (event) {
      return this._emit('kraken:error', {
        errorMessage: 'Error parsing the payload',
        data: event.data,
        error: event,
      })
    }

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

    allEmits.forEach(({ name, payload }) => this._emit(name, payload))

    // if (
    //   payload.event === 'subscriptionStatus' &&
    //   payload.status === 'subscribed'
    // ) {
    //   return this._emit('kraken:subscribe:success', payload)
    // }

    // if (
    //   isValidPrivateName(payload.subscription.name) &&
    //   payload.event === 'subscriptionStatus' &&
    //   payload.status === 'error' &&
    //   // no registered subscription -> trying to subscribe
    //   !this.subscriptions[payload.subscription.name]
    // ) {
    //   return this._emit('kraken:subscribe:failure', payload)
    // }

    // if (
    //   payload.event === 'subscriptionStatus' &&
    //   payload.status === 'unsubscribed'
    // ) {
    //   return this._emit('kraken:unsubscribe:success', payload)
    // }

    // if (
    //   isValidPrivateName(payload.subscription.name) &&
    //   payload.event === 'subscriptionStatus' &&
    //   payload.status === 'error' &&
    //   // registered subscription -> trying to unsubscribe
    //   this.subscriptions[payload.subscription.name]
    // ) {
    //   return this._emit('kraken:unsubscribe:failure', payload)
    // }

    if (!allEmits.length) {
      this._emit('kraken:unhandled', payload)
    }
  }

  _establishConnection = ({ onClose }) => new Promise((resolve, reject) => {
    const ws = new this._options.WebSocket(this._options.url)
    this._connection = null

    ws.onopen = () => {
      this._connection = ws
      resolve(ws)
    }

    ws.onerror = error => {
      reject(error)
    }

    ws.onclose = () => {
      if (!this._connection) return
      this._connection = null
      onClose && onClose()
    }

    ws.onmessage = this.handleMessage
  })
}
