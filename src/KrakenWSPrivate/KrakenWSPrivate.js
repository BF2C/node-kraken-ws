import { KrakenWS } from '../KrakenWS/KrakenWS'
import { handleSubscriptionEvent } from './handleSubscriptionEvent'
import { handleSubscriptionError } from './handleSubscriptionError'
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
      handleSubscriptionEvent,
      handleSubscriptionError,
      handleSubscriptionSuccess,
      handleUnsubscriptionSuccess,
      handleUnsubscriptionError,
    ]
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
      .then(response => ({
        ...response,
        unsubscribe: () => this.unsubscribe({ name })
      }))
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
