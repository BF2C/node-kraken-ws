import WebSocket from 'ws'
import EventEmitter from 'events'

import { isValidPublicName } from './isValidPublicName'
import { isValidPrivateName } from './isValidPrivateName'

/**
 * @typedef {String} PairName
 */

/**
 * @typedef {Object} Subscription
 *
 * @prop {String} name
 * Name of the subscription. Please refer to
 * https://docs.kraken.com/websockets/#message-subscribe
 * to get a list of all available subscriptions
 *
 * @prop {Int} channelID
 * Kraken channel ID of the subscription
 *
 * @prop {Function} onEstablish
 * Used internally to resolve the subscribe-promise
 * when the ws responds with a success message
 *
 * @prop {Function} onFail
 * Used internally to reject the subscribe-promise
 * when the ws responds with an error message
 */

/**
 * I've used the proposal to use `typeof Class`
 * for some of the types. It is not official,
 * but it's being disucssed, see:
 * https://github.com/jsdoc/jsdoc/issues/1349
 *
 * @typedef {Object} Options
 * @prop {String} url
 * @prop {String} [token]
 * @prop {Int} [retryCount]
 * @prop {Int} [retryDelay]
 * @prop {typeof EventEmitter} EventEmitter
 * Class to be instantiated as event handler
 * Must follow the api of the EventEmitter class
 * @prop {typeof WebSocket} WebSocket
 * Class to be instantiated as websocket instance
 * Must follow the api of the WebSocket class provided by the ws npm module
 */

const DEFAULT_OPTIONS = {
  url: 'wss://ws-auth.kraken.com',
  retryCount: 5,
  retryDelay: 1000, // ms
  EventEmitter, // Event handler for composition
  WebSocket, // web socket class
}

/**
 * Auto-binds all methods so they can be used in functional contexts.
 * This class makes extensive use of the reqid parameter that kraken
 * accepts. If you want to use your own reqids, you have to provide
 * a reqid with every subscription you make.
 *
 * @class KrakenWS
 * @prop {bool} connected
 * @prop {Object} subscriptions
 */
export class KrakenWS {
  /**
   * @param {Object} options
   * @param {String} [options.url]
   * @param {String} [options.token]
   */
  constructor(options) {
    // "private" properties
    this._connecting = Promise.reject()
    this._connection = null
    this._eventHandler = new options.EventEmitter()
    this._nextReqid = 0
    this._options = { ...DEFAULT_OPTIONS, ...options }
    this._retryCounter = 0

    // public properties
    this.connected = false
    this.subscriptions = {
      ticker: {},
      trade: {},
      spread: {},
      ohlc: {},
      book: {},
      ownTrades: false,
      openOrders: false,
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

  /**
   * @return {Promise.<void>}
   */
  connect = () => {
    if (this.connected) {
      return Promise.resolve()
    }

    this._connecting = new Promise((resolve, reject) => {
      const ws = new this._options.WebSocket(this._options.url)
      this._connection = ws
      
      ws.onopen = () => {
        this.connected = true
        this._emit('kraken:connection:established')
        resolve()
      }

      ws.onerror = error => {
        console.log('@TODO onerror:', error)
        reject()
      }

      ws.onclose = (...payload) => {
        // Only reconnect if connection has not been terminated manually
        this.connected && this._retryConnecting()
        this._emit('kraken:connection:closed')
      }

      ws.onmessage = message => this.handleMessage(message)
    })

    return this._connecting
  }

  /**
   * @returns {Promise.<void>}
   */
  disconnect = () => {
    if (!this.connected) {
      return Promise.reject(`Connection already closed`)
    }

    this.connected = false
    this._connection.disconnect()
    this._connecting = Promise.reject('Closed manually')

    return new Promise(resolve => {
      const unsubscribe = this.on('kraken:connection:closed', () => {
        unsubscribe()
        resolve()
      })
    })
  }

  /**
   * @returns {void}
   */
  _retryConnecting = () => {
    if (this._retryCounter === this._options.retryCount) {
      if (this._retryCounter !== 0) {
        this._emit('kraken:reconnect:failure', {
          errorMessage:
            `Reconnecting failed.\nTried reconnecting ${this._options.retryCount} times.`,
        })
      }

      return
    }

    if (this._retryCounter === 0) {
      this._emit('kraken:reconnect:start')
    }

    this.retryCount++
    
    this._retryTimeout()
      .then(() => {
        this.connect()
          .then(() => {
            this._emit('kraken:reconnect:success')
          })
          .catch(this._retryConnecting)
      })
      .catch(() => {
        /* ignore as connection has been terminated manually */
      })
  }

  _retryTimeout = () => new Promise((resolve, reject) => {
    let timeoutID

    const unsubscribe = this.on('kraken:connection:closed', () => {
      if (!this.connected) reject()
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
    const payload = process.env.NODE_ENV === 'production'
      ? JSON.stringify(message)
      : JSON.stringify(message, null, 2)

    this._connection.send(payload)
  }

  /**
   * @param {Function} handler
   * @returns {Promise.<any>}
   */
  _withConnection = handler => this._withConnection(
    () => handler(this._connection),
    () => Promise.reject('No established websocket connection'),
  )

  /**
   * @param {Object} options
   * @param {String} options.pair
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToTicker = ({ pair, reqid }) =>
    this.subscribePublic(pair, 'ticker', { reqid })

  /**
   * @param {Object} options
   * @param {String[]} options.pairs
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToTickerMutliple = ({ pairs, reqid }) =>
    this.subscribePublicMultiple(pairs, 'ticker', { reqid })

  /**
   * @param {Object} options
   * @param {String} options.pair
   * @param {Int} [options.reqid]
   * @param {Int} [options.interval]
   * @returns {Promise.<bool>}
   */
  subscribeToOHLC = ({ pair, reqid, interval }) =>
    this.subscribePublic(pair, 'ohlc', { reqid, interval })

  /**
   * @param {Object} options
   * @param {String[]} options.pairs
   * @param {Int} [options.reqid]
   * @param {Int} [options.interval]
   * @returns {Promise.<bool>}
   */
  subscribeToOHLCMultiple = ({ pairs, reqid, interval }) =>
    this.subscribePublicMultiple(pairs, 'ohlc', { reqid, interval })

  /**
   * @param {String} pair
   * @param {Object} [options]
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToTrade = ({ pair, reqid }) =>
    this.subscribePublic(pair, 'trade', { reqid })

  /**
   * @param {String[]} pair
   * @param {Object} [options]
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToTradeMultiple = ({ pairs, reqid }) =>
    this.subscribePublicMultiple(pairs, 'trade', { reqid })

  /**
   * @param {Object} options
   * @param {String} options.pair
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToSpread = ({ pair, reqid }) =>
    this.subscribePublic(pair, 'spread', { reqid })

  /**
   * @param {Object} options
   * @param {String[]} options.pairs
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToSpreadMultiple = ({ pairs, reqid }) =>
    this.subscribePublicMultiple(pairs, 'spread', { reqid })

  /**
   * @param {Object} options
   * @param {String} options.pair
   * @param {Int} [options.reqid]
   * @param {Int} [options.depth]
   * @returns {Promise.<bool>}
   */
  subscribeToBook = ({ pair, reqid, depth }) =>
    this.subscribePublic(pair, 'book', { reqid, depth })

  /**
   * @param {Object} options
   * @param {String[]} options.pairs
   * @param {Int} [options.reqid]
   * @param {Int} [options.depth]
   * @returns {Promise.<bool>}
   */
  subscribeToBookMultiple = ({ pairs, reqid, depth }) =>
    this.subscribePublicMultiple(pairs, 'book', { reqid, depth })

  /**
   * @param {Object} options
   * @param {String} options.token
   * @param {Int} [options.reqid]
   * @param {Bool} [options.snapshot]
   * @returns {Promise.<bool>}
   */
  subscribeToOwnTrades = ({ token, reqid, snapshot }) =>
    this.subscribePrivate('ownTrades', { reqid, snapshot, token })

  /**
   * @param {Object} options
   * @param {String} options.token
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToOpenOrders = ({ token, reqid }) =>
    this.subscribePrivate('openOrders', { reqid, token })

  /**
   * @param {String[]|String} pair
   * @param {String} name
   * @param {Object} [options]
   * @param {Int} [options.reqid]
   * @param {Int} [options.depth]
   * @param {Int} [options.interval]
   * @param {bool} [options.snapshot]
   * @param {String} [options.token]
   * @returns {Promise.<bool>}
   */
  subscribePublic = (pair, name, options) => this._withConnection(() => {
    if (!name) return Promise.reject(
      "You need to provide 'name' when subscribing"
    )

    if (!pair) return Promise.reject(
      "You need to provide 'pair' when subscribing"
    )

    if (!isValidPublicName(name)) return Promise.reject(
      `Invalid name. Valid names are: 'ticker', 'ohlc', 'trade', 'spread', 'book'. Received '${name}'`
    )

    const { reqid, depth, interval, snapshot, token } = options
    const alreadySubscribed = this.subscriptions[name][pair] && pair

    if (alreadySubscribed) return Promise.reject({
      errorMessage: 'already subscribed',
      pair: alreadySubscribed,
      name,
    })

    const nextReqid = reqid || this._nextReqid++
    const response = this.send({
      pair: [pair],
      event: 'subscribe',
      reqid: nextReqid,
      subscription: { name, depth, interval, snapshot },
    })

    const checker = payload => payload.reqid === nextReqid && payload.pair === pair
    return this._handleSubscription(checker)
      .then(payload => {
        this.subscriptions[name][pair] = payload.channelID

        return {
          ...payload,
          unsubscribe: () => this.unsubscribe({ pair, name, options })
        }
      })
  })

  /**
   * @param {String[]} pairs
   * @param {String} name
   * @param {Object} [options]
   * @param {Int} [options.reqid]
   * @param {Int} [options.depth]
   * @param {Int} [options.interval]
   * @param {bool} [options.snapshot]
   * @returns {Promise.<bool>}
   */
  subscribePublicMultiple = (pairs, name, options) => this._withConnection(() => {
    const { reqid, depth, interval, snapshot } = options

    if (!name) return Promise.reject(
      "You need to provide 'name' when subscribing"
    )

    if (!pairs || !pairs.length) return Promise.reject(
      "You need to provide 'pairs' of type String[] when subscribing"
    )

    if (!isValidPublicName(name)) return Promise.reject(
      `Invalid name. Valid names are: 'ticker', 'ohlc', 'trade', 'spread', 'book'. Received '${name}'`
    )

    const alreadySubscribed = pairs.reduce(
      (found, _, pair) => {
        if (found) return found
        return this.subscriptions[name][pair] ? pair : found
      },
      ''
    )

    if (alreadySubscribed) return Promise.reject({
      errorMessage: 'already subscribed',
      pair: alreadySubscribed,
      name,
    })

    const nextReqid = reqid || this._nextReqid++
    const response = this.send({
      event: 'subscribe',
      pair: pairs,
      reqid: nextReqid,
      subscription: { name, depth, interval, snapshot },
    })

    return Promise.all(
      pairs.map(curPair => {
        const checker = payload => payload.reqid === nextReqid && payload.pair === curPair

        return this._handleSubscription(checker)
          .then(payload => {
            this.subscriptions[name][curPair] = payload.channelID
            return payload
          })
          // will be handles in the next `.then` step
          // We just need to make sure they're not added to `this.subscriptions`
          .catch(payload => {
            return payload
          })
      })
    ).then(
      /*
       * This will divide the responses into successful and failed responses.
       * If none of the subscriptions was successful, the promise will reject
       */
      responses => {
        const successfulResponses = responses.filter(response => !response.errorMessage)
        const failureResponses = responses.filter(response => !!response.errorMessage)

        if (!successfulResponses.length) {
          return Promise.reject(responses)
        }

        return {
          success: successfulResponses,
          failure: failureResponses,
          unsubscribe: () => this.unsubscribeMultiple({ pairs, name, options }),
        }
      }
    )
  })

  /**
   * @param {String} name
   * @param {Object} options
   * @param {String} options.token
   * @param {Int} [options.reqid]
   * @param {bool} [options.snapshot]
   * @returns {Promise.<bool>}
   */
  subscribePrivate = (name, { token, reqid, snapshot }) => this._withConnection(() => {
    if (!name) return Promise.reject(
      'You need to provide "name" when subscribing'
    )

    if (!token) return Promise.reject(
      'You need to provide "options.token" when subscribing'
    )

    if (!isValidPrivateName(name)) return Promise.reject(
      `Invalid name. Valid names are: 'ownTrades', 'openOrders'. Received '${name}'`
    )

    if (this.subscriptionsPrivate[name]) return Promise.reject(`You've already subscribed to "${name}"`)

    const nextReqid = reqid || this._nextReqid++
    this.send({
      event: 'subscribe',
      reqid: nextReqid,
      subscription: { name, token, reqid },
    })

    const checker = payload => payload.reqid === nextReqid
    return this._handleSubscription(checker).then(payload => {
      this.subscriptions[name] = true
      return payload
    })
  })

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

  /**
   * @param {Object} args
   * @param {String} args.name
   * @param {String} [args.pair]
   * @param {Int} [args.reqid]
   * @param {Object} [args.options]
   * @param {Int} [args.options.depth]
   * @param {Int} [args.options.interval]
   * @param {String} [args.options.token]
   * @returns {Promise.<bool>}
   */
  unsubscribe = ({ pair, name, reqid, options }) => this._withConnection(() => {
    if (!name)
      return Promise.reject('You need to provide "name" when subscribing')

    const isPublic = isValidPublicName(name)

    if (isPublic && !pair)
      return Promise.reject('You need to provide "pair" when unsubscribing')

    //if (isPublic && !this.subscriptions[name][pair])
    //  return Promise.reject(`You have not subscribed to "${name}" with pair "${pair}"`)

    const nextReqid = reqid || this._nextReqid++
    const response = this.send({
      event: 'unsubscribe',
      reqid: nextReqid,
      subscription: { name, ...options },
      ...(isPublic ? { pair: [pair] } : {}),
    })

    const checker = payload =>
      payload.reqid === nextReqid &&
      // XOR; Either no pair has been provided or
      // the provided pair matches the event's pair
      !pair ^ payload.pair === pair

    return this._handleUnsubscription(checker)
      .then(payload => {
        delete this.subscriptions[name][pair]
        return payload
      })
  })

  /**
   * @param {Object} args
   * @param {String[]} args.pairs
   * @param {String} args.name
   * @param {Int} [args.reqid]
   * @param {Object} [args.options]
   * @param {Int} [args.options.depth]
   * @param {Int} [args.options.interval]
   * @param {String} [args.options.token]
   * @returns {Promise.<bool>}
   */
  unsubscribeMultiple = ({ pairs, name, reqid, options }) => this._withConnection(() => {

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
  handleMessage = e => {
    let payload

    try {
      payload = JSON.parse(e.data);
    } catch (e) {
      return this._emit('kraken:error', {
        errorMessage: 'Error parsing the payload',
        data: e.data,
        error: e,
      })
    }

    if (!(payload instanceof Object)) {
      return this._emit('kraken:error', {
        errorMessage:
          `Payload received from kraken is not handled. Received "${payload}"`,
        data: e.data,
        error: e,
      })
    }

    if (payload.event === 'systemStatus') {
      return this._emit('kraken:systemStatus', payload)
    } else if (payload.event === 'heartbeat') {
      return this._emit('kraken:heartbeat')
    }

    if (payload.event === 'pong') {
      return this._emit('kraken:pong', payload)
    }

    if (
      payload.event === 'subscriptionStatus' &&
      payload.status === 'subscribed'
    ) {
      return this._emit('kraken:subscribe:success', payload)
    }

    if (
      isValidPrivateName(payload.subscription.name) &&
      payload.event === 'subscriptionStatus' &&
      payload.status === 'error' &&
      // no registered subscription -> trying to subscribe
      !this.subscriptions[payload.subscription.name]
    ) {
      return this._emit('kraken:subscribe:failure', payload)
    }

    if (
      payload.event === 'subscriptionStatus' &&
      payload.status === 'error' &&
      // no registered subscription -> trying to subscribe
      !this.subscriptions[payload.subscription.name][payload.pair]
    ) {
      return this._emit('kraken:subscribe:failure', payload)
    }

    if (
      payload.event === 'subscriptionStatus' &&
      payload.status === 'unsubscribed'
    ) {
      return this._emit('kraken:unsubscribe:success', payload)
    }

    if (
      isValidPrivateName(payload.subscription.name) &&
      payload.event === 'subscriptionStatus' &&
      payload.status === 'error' &&
      // registered subscription -> trying to unsubscribe
      this.subscriptions[payload.subscription.name]
    ) {
      return this._emit('kraken:unsubscribe:failure', payload)
    }

    if (
      payload.event === 'subscriptionStatus' &&
      payload.status === 'error' &&
      // registered subscription -> trying to unsubscribe
      this.subscriptions[payload.subscription.name][payload.pair]
    ) {
      return this._emit('kraken:unsubscribe:failure', payload)
    }

    if (Array.isArray(payload) && Number.isInteger(payload[0])) {
      const event = {
        channelID: payload[0],
        data: payload[1],
        name: payload[2],
        pair: payload[3],
      }

      return this._emit('kraken:subscription:event', event)
    }

    return this._emit('kraken:unhandled', payload)
  }
}
