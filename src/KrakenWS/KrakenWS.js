import WebSocket from 'ws'
//import crypto from 'crypto'
import EventEmitter from 'events'

import { createUnsubscribePayload } from './createUnsubscribePayload'
import { getSubscribedPairs } from './getSubscribedPairs'
import { isValidPublicName } from './isValidPublicName'
import { isValidPrivateName } from './isValidPrivateName'
import { removeSubscriptions } from './removeSubscriptions'

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
 * @typedef {Object} Options
 * @prop {String} url
 * @prop {String} [token]
 */

const DEFAULT_OPTIONS = {
    url: 'wss://ws.kraken.com',
}

/**
 * Auto-binds all methods so they can be used in functional contexts
 *
 * @class KrakenWS
 * @prop {bool} connected
 * @prop {WebSocket} connection
 * @prop {Object.<PairName, Subscription[]>} subscriptions
 * @prop {Options} options
 */
export class KrakenWS extends EventEmitter {
  /**
   * @param {Object} options
   * @param {String} [options.url]
   * @param {String} [options.token]
   */
  constructor(options) {
    super()
    
    this.nextReqid = 0
    this.connected = false
    this.connection = null
    this.subscriptions = {
      ticker: {},
      trade: {},
      spread: {},
      ohlc: {},
      book: {},
      ownTrades: false,
      openOrders: false,
    }
    this.options = { ...DEFAULT_OPTIONS, ...options }

    // bind EventEmitter methods
    this.emit = this.emit.bind(this)
  }

  on(event, callback) {
    super.on(event, callback)
    return () => this.removeListener(event, callback)
  }

  connect = () => {
    if (this.connected) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.options.url)
      this.ws = ws
      
      ws.onopen = () => {
        this.connected = true
        resolve()
      }

      ws.onerror = error => {
        console.log('@TODO onerror:', error)
        reject()
      }

      ws.onclose = (...payload) => {
        console.log('@TODO onclose:', ...payload)
      }

      ws.onmessage = message => this.handleMessage(message)
    })
  }

  disconnect = () => {
    if (this.connected) {
      this.ws.disconnect()
    }
  }

  send = message => {
    const payload = process.env.NODE_ENV === 'production'
      ? JSON.stringify(message)
      : JSON.stringify(message, null, 2)

    this.ws.send(payload)
  }

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
  subscribePublic(pair, name, options) {
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

    const nextReqid = reqid || this.nextReqid++
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
  }

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
  subscribePublicMultiple(pairs, name, options) {
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

    const nextReqid = reqid || this.nextReqid++
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
  }

  /**
   * @param {String} name
   * @param {Object} options
   * @param {String} options.token
   * @param {Int} [options.reqid]
   * @param {bool} [options.snapshot]
   * @returns {Promise.<bool>}
   */
  subscribePrivate(name, { token, reqid, snapshot }) {
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

    const nextReqid = reqid || this.nextReqid++
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
  unsubscribe({ pair, name, reqid, options }) {
    if (!name)
      return Promise.reject('You need to provide "name" when subscribing')

    const isPublic = isValidPublicName(name)

    if (isValidPublicName(name) && !pair)
      return Promise.reject('You need to provide "pair" when unsubscribing')

    //if (isPublic && !this.subscriptions[name][pair])
    //  return Promise.reject(`You have not subscribed to "${name}" with pair "${pair}"`)

    const nextReqid = reqid || this.nextReqid++
    const response = this.send({
      pair: [pair],
      event: 'unsubscribe',
      reqid: nextReqid,
      subscription: { name, ...options },
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
  }

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
  unsubscribeMultiple = ({ pairs, name, reqid, options }) => {

  }

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
  ping = ({ reqid } = {}) => new Promise(resolve => {
    const nextReqid = reqid || this.nextReqid++

    const unsubscribe = this.on('kraken:pong', payload => {
      if (payload.reqid !== nextReqid) return
      unsubscribe()
      resolve(payload)
    })

    this.send({ event: 'ping', reqid: reqid })
  })
  
  handleMessage = e => {
    let payload

    try {
      payload = JSON.parse(e.data);
    } catch (e) {
      return this.emit('kraken:error', {
        errorMessage: 'Error parsing the payload',
        data: e.data,
        error: e,
      })
    }

    if (!(payload instanceof Object)) {
      return this.emit('kraken:error', {
        errorMessage:
          `Payload received from kraken is not handled. Received "${payload}"`,
        data: e.data,
        error: e,
      })
    }

    if (payload.event === 'systemStatus') {
      return this.emit('kraken:systemStatus', payload)
    } else if (payload.event === 'heartbeat') {
      return this.emit('kraken:heartbeat')
    }

    //console.log('MESSAGE:', JSON.stringify(payload, null, 2))
    //console.log('');

    if (payload.event === 'pong') {
      return this.emit('kraken:pong', payload)
    }

    if (
      payload.event === 'subscriptionStatus' &&
      payload.status === 'subscribed'
    ) {
      return this.emit('kraken:subscribe:success', payload)
    }

    if (
      payload.event === 'subscriptionStatus' &&
      payload.status === 'error' &&
      // no registered subscription -> trying to subscribe
      !this.subscriptions[payload.subscription.name][payload.pair]
    ) {
      return this.emit('kraken:subscribe:failure', payload)
    }

    if (
      payload.event === 'subscriptionStatus' &&
      payload.status === 'unsubscribed'
    ) {
      return this.emit('kraken:unsubscribe:success', payload)
    }

    if (
      payload.event === 'subscriptionStatus' &&
      payload.status === 'error' &&
      // registered subscription -> trying to unsubscribe
      this.subscriptions[payload.subscription.name][payload.pair]
    ) {
      return this.emit('kraken:unsubscribe:failure', payload)
    }

    if (Array.isArray(payload) && Number.isInteger(payload[0])) {
      const event = {
        channelID: payload[0],
        data: payload[1],
        name: payload[2],
        pair: payload[3],
      }

      return this.emit('kraken:subscription:event', event)
    }

    return this.emit('kraken:unhandled', payload)
  }
}
