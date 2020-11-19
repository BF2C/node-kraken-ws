import { KrakenWS } from '../KrakenWS/KrakenWS'
import { handleAddOrderFailure } from './handleAddOrderFailure'
import { handleAddOrderSuccess } from './handleAddOrderSuccess'
import { handleCancelAllFailure } from './handleCancelAllFailure'
import { handleCancelAllSuccess } from './handleCancelAllSuccess'
import { handleCancelOrderFailure } from './handleCancelOrderFailure'
import { handleCancelOrderSuccess } from './handleCancelOrderSuccess'
import { handleSubscriptionError } from './handleSubscriptionError'
import { handleSubscriptionEvent } from './handleSubscriptionEvent'
import { handleSubscriptionSuccess } from './handleSubscriptionSuccess'
import { handleUnsubscriptionError } from './handleUnsubscriptionError'
import { handleUnsubscriptionSuccess } from './handleUnsubscriptionSuccess'

const DEFAULT_OPTIONS = {
  url: 'wss://ws-auth.kraken.com',
}

export class KrakenWSPrivate extends KrakenWS {
/**
 * @constructor
 * @param {Object} options
 *
 * @param {String} [options.token]
 * Token for auth
 *
 * @param {String} [options.url]
 * Default public url is: 'wss://ws.kraken.com'
 * Default private url is: 'wss://ws-auth.kraken.com'
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
    super(options)

    if (!options.token) {
      throw new Error(
        `You need to provide a token when using the class for accessing private channels`
      )
    }

    this._options = { ...DEFAULT_OPTIONS, ...this._options }

    this.subscriptions = {
      ...this.subscriptions,
      ownTrades: false,
      openOrders: false,
    }

    this.socketMessageHandlers = [
      ...this.socketMessageHandlers,
      handleAddOrderFailure,
      handleAddOrderSuccess,
      handleCancelAllFailure,
      handleCancelAllSuccess,
      handleCancelOrderFailure,
      handleCancelOrderSuccess,
      handleSubscriptionError,
      handleSubscriptionEvent,
      handleSubscriptionSuccess,
      handleUnsubscriptionError,
      handleUnsubscriptionSuccess,
    ]
  }

  /**
   * @param {Object} options
   * @param {String} options.ordertype
   * @param {String} options.type
   * @param {String} options.pair
   * @param {Float} options.volume
   * @param {Float} [options.price]
   * @param {Float} [options.price2]
   * @param {Int} [options.reqid]
   * @param {Float} [options.leverage]
   * @param {String} [options.oflags]
   * @param {String} [options.starttm]
   * @param {String} [options.expiretm]
   * @param {String} [options.userref]
   * @param {String} [options.validate]
   * @param {Object} [options.close]
   * @param {String} [options.close.ordertype]
   * @param {Float} [options.close.price]
   * @param {Float} [options.close.price2]
   * @param {String} [options.trading_agreement]
   *
   * @returns {Promise.<{
   *  event: String,
   *  reqid: Int,
   *  status: String,
   *  txid: string,
   *  descr: string,
   *  errorMessage,
   * }>}
   */
  addOrder = ({
    ordertype,
    type,
    pair,
    volume,
    price,
    price2,
    reqid,
    leverage,
    oflags,
    starttm,
    expiretm,
    userref,
    validate,
    trading_agreement,
    close,
  }) => {
    const { token } = this._options
    const {
      ordertype: closeOrdertype,
      price: closePrice,
      price2: closePrice2,
    } = close || {}
    const nextReqid = reqid || this._nextReqid++

    this.send({
      event: 'addOrder',
      reqid: nextReqid,
      ordertype,
      type,
      pair,
      volume: volume.toString(),
      price: price.toString(),
      token,
      price2,
      leverage,
      oflags,
      starttm,
      expiretm,
      userref,
      validate,
      close: (closeOrdertype || closePrice || closePrice2 ? {
        ordertype: closeOrdertype,
        price: closePrice,
        price2: closePrice2,
      } : undefined),
      trading_agreement,
    })

    return this._handleOneTimeMessageResponse(
      payload => payload.reqid === nextReqid,
      'kraken:addorder:success',
      'kraken:addorder:failure',
    )
  }

  /**
   * @param {Object} options
   * @param {String[]|String} options.txid
   * @param {Object} [options.reqid]
   *
   * @returns {Promise.<void>}
   *
   * Rejects with {
   *   errorMessag: String
   *   failed: Int
   *   total: Int
   * }
   */
  cancelOrder = ({
    reqid,
    txid,
  }) => {
    const { token } = this._options
    const nextReqid = reqid || this._nextReqid++
    const txids = Array.isArray(txid) ? txid : [txid]

    this.send({
      token,
      event: 'cancelOrder',
      reqid: nextReqid,
      txid: txids
    })

    return new Promise((resolve, reject) => {
      let unsubscribeSuccess, unsubscribeFailure
      let counter = 0, failed = 0

      const callback = payload => {
        if (payload.reqid !== nextReqid) return

        counter += 1

        if (payload.status === 'error') {
          failed += 1
        }

        if (counter === txids.length) {
          unsubscribeSuccess()
          unsubscribeFailure()
          failed === 0 ? resolve() : reject({
            failed,
            errorMessage: `Some orders could not be cancelled (${failed}/${counter})`,
            total: counter,
          })
        }
      }

      unsubscribeSuccess = this.on('kraken:cancelorder:success', callback)
      unsubscribeFailure = this.on('kraken:cancelorder:failure', callback)
    })
  }

  /**
   * @param {Object} [options]
   * @param {Object} [options.reqid]
   *
   * @returns {Promise.<{
   *   event: 'cancelAllStatus',
   *   reqid: Int,
   *   count: Int,
   *   status: 'ok' | 'error',
   *   errorMessage: String,
   * }>}
   */
  cancelAll = ({ reqid } = {}) => {
    const { token } = this._options
    const nextReqid = reqid || this._nextReqid++

    this.send({
      token,
      event: 'cancelAll',
      reqid: nextReqid,
    })

    return this._handleOneTimeMessageResponse(
      payload => payload.reqid === nextReqid,
      'kraken:cancelall:success',
      'kraken:cancelall:failure',
    )
  }

  /**
   * @param {Object} options
   * @param {Int} [options.reqid]
   * @param {Bool} [options.snapshot]
   * @returns {Promise.<bool>}
   */
  subscribeToOwnTrades = ({ reqid, snapshot } = {}) =>
    this.subscribe('ownTrades', { reqid, snapshot })

  /**
   * @param {Object} options
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToOpenOrders = ({ reqid } = {}) =>
    this.subscribe('openOrders', { reqid })

  /**
   * @param {String} name
   * @param {Object} options
   * @param {String} options.token
   * @param {Int} [options.reqid]
   * @param {bool} [options.snapshot]
   * @returns {Promise.<bool>}
   */
  subscribe = (name, { reqid, snapshot }) => {
    if (!name) return Promise.reject(
      'You need to provide "name" when subscribing'
    )

    if (!this._options.token) return Promise.reject(
      'You need to initialize this class with a token if you want to access private streams'
    )

    if (this.subscriptions[name])
      return Promise.reject(`You've already subscribed to "${name}"`)
    this.subscriptions[name] = true

    const { token } = this._options
    const nextReqid = reqid || this._nextReqid++
    this.send({
      event: 'subscribe',
      reqid: nextReqid,
      subscription: { name, reqid, token },
    })

    const checker = payload => payload.reqid === nextReqid
    return this._handleSubscription(checker)
      .catch(error => {
        this.subscriptions[name] = false
        return Promise.reject(error)
      })
  }

  /**
   * @param {Object} args
   * @param {String} args.name
   * @param {Int} [args.reqid]
   * @returns {Promise.<bool>}
   */
  unsubscribe = ({ name, reqid }) => {
    if (!name)
      return Promise.reject('You need to provide "name" when unsubscribing')

    const { token } = this._options
    const nextReqid = reqid || this._nextReqid++

    const response = this.send({
      event: 'unsubscribe',
      reqid: nextReqid,
      subscription: { name, token },
    })

    const checker = payload =>
      payload.reqid === nextReqid

    return this._handleUnsubscription(checker)
      .then(payload => {
        this.subscriptions[name] = false
        return payload
      })
  }
}
