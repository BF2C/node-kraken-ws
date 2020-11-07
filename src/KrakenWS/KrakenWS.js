import WebSocket from 'ws'
import crypto from 'crypto'
import EventEmitter from 'events'

import { addNewSubscriptions } from './addNewSubscriptions'
import { createNewSubscriptionPayload } from './createNewSubscriptionPayload'
import { createSubscription } from './createSubscription'
import { createUnsubscribePayload } from './createUnsubscribePayload'
import { getSubscribedPairs } from './getSubscribedPairs'
import { getUnsubscribedPairs } from './getUnsubscribedPairs'
import { handleNewSubscriptionSuccess } from './handleNewSubscriptionSuccess'
import { handleSystemStatus } from './handleSystemStatus'
import { handleSubscriptionEvent } from './handleSubscriptionEvent'
import { handleHeartBeat } from './handleHeartBeat'
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
    
    this.connected = false
    this.connection = null
    this.subscriptions = {}
    this.options = { ...DEFAULT_OPTIONS, ...options }

    // bind EventEmitter methods
    this.emit = this.emit.bind(this)
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

  /**
   * @param {Object} options
   * @param {String[]|String} options.pair
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToTicker = ({ pair, reqid }) => this.subscribe(
    pair,
    'ticker',
    { reqid },
  )

  /**
   * @param {Object} options
   * @param {String[]|String} options.pair
   * @param {Int} [options.reqid]
   * @param {Int} [options.interval]
   * @returns {Promise.<bool>}
   */
  subscribeToOHLC = ({ pair, reqid, interval }) => this.subscribe(
    pair,
    'ohlc',
    { reqid, interval },
  )

  /**
   * @param {String[]|String} pair
   * @param {Object} [options]
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToTrade = ({ pair, reqid }) => this.subscribe(
    pair,
    'trade',
    { reqid },
  )

  /**
   * @param {Object} options
   * @param {String[]|String} options.pair
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToSpread = ({ pair, reqid }) => this.subscribe(
    pair,
    'spread',
    { reqid },
  )

  /**
   * @param {Object} options
   * @param {String[]|String} options.pair
   * @param {Int} [options.reqid]
   * @param {Int} [options.depth]
   * @returns {Promise.<bool>}
   */
  subscribeToBook = ({ pair, reqid, depth }) => this.subscribe(
    pair,
    'book',
    { reqid, depth },
  )

  /**
   * @param {Object} options
   * @param {String[]|String} options.pair
   * @param {String} options.token
   * @param {Int} [options.reqid]
   * @param {Bool} [options.snapshot]
   * @returns {Promise.<bool>}
   */
  subscribeToOwnTrades = ({ pair, reqid, snapshot, token }) => this.subscribe(
    pair,
    'ownTrades',
    { reqid, snapshot, token },
  )

  /**
   * @param {Object} options
   * @param {String} options.token
   * @param {String[]|String} [options.pair]
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToOpenOrders = ({ pair, reqid, token }) => this.subscribe(
    pair,
    'openOrders',
    { reqid, token },
  )

  /**
   * @param {Object} options
   * @param {String} options.token
   * @param {String[]|String} [options.pair]
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToOpenOrders = ({ pair, reqid, token }) => this.subscribe(
    pair,
    'openOrders',
    { reqid, token },
  )

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
  subscribe(pair, name, options) {
    if (!name) return Promise.reject(`You need to provide 'name' when subscribing`)
    if (!pair) return Promise.reject(`You need to provide 'pair' when subscribing`)

    const pairs = getUnsubscribedPairs({ pair, name, subscriptions: this.subscriptions })

    if (!pairs.length) {
      return Promise.reject(
        `All provided pairs have already been subscribed to, reveived: ${pairs.join(', ')}`
      )
    }

    const establishProcesses = addNewSubscriptions(this.subscriptions, pairs, name)
    const payload = createNewSubscriptionPayload({ pairs, name, ...options })
    const message = JSON.stringify(payload)
    const response = this.ws.send(message)

    return Promise.all(establishProcesses)
  }

  /**
   * @param {String[]|String} pair
   * @param {'book'|'ohlc'|'openOrders'|'ownTrades'|'spread'|'ticker'|'trade'|'*'} name
   * @param {Object} [options]
   * @param {Int} [options.reqid]
   * @param {Int} [options.depth]
   * @param {Int} [options.interval]
   * @param {String} [options.token]
   * @returns {Promise.<bool>}
   */
  unsubscribe(pair, name, options) {
    if (!name) return Promise.reject(`You need to provide 'name' when unsubscribing`)
    if (!pairs) return Promise.reject(`You need to provide 'pair' when unsubscribing`)

    const pairs = getSubscribedPairs({ pair, name, subscriptions: this.subscriptions })

    if (!pairs.length) {
      return Promise.reject(
        `All provided pairs have already been unsubscribed, reveived: ${pairs.join(', ')}`
      )
    }

    removeSubscriptions(this.subscriptions, pairs, name)

    const payload = createUnsubscribePayload({ pairs, name, ...options })
    const message = JSON.stringify(payload)
    this.ws.send(message)

    return Promise.resolve()
  }

  //ping() {

  //}
  
  handleMessage(e) {
    const payload = JSON.parse(e.data);

    if (payload.event === 'systemStatus') {
      return handleSystemStatus(this.emit, payload)
    }

    if (payload.event === 'subscriptionStatus' && payload.status === 'subscribed') {
      return handleNewSubscriptionSuccess(this.emit, this.subscriptions, payload)
    }
    
    if (payload.event === 'heartbeat') {
      return handleHeartBeat(this.emit)
    }

    if (Array.isArray(payload) && Number.isInteger(payload[0])) {
      return handleSubscriptionEvent(this.emit, payload)
    }

    console.log('message:', JSON.stringify(payload, null, 2));

    //if(Array.isArray(payload)) {
    //  this.emit('channel:' + payload[0], payload);
    //} else {

    //  if(payload.event === 'subscriptionStatus' && payload.status === 'subscribed') {

    //    if(this.pairs[payload.pair]) {
    //      this.pairs[payload.pair].id = payload.channelID;
    //      this.pairs[payload.pair].onReady(payload.channelID);
    //    } else {
    //      console.log(new Date, '[KRAKEN] received subscription event for unknown subscription', payload);
    //    }

    //    return;
    //  }

    //  this.emit('message', payload);
    //}
  }
}
