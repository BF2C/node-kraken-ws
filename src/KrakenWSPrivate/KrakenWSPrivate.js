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
      ownTrades: null,
      openOrders: null,
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

  resubscribe = () => {
    super.resubscribe()

    if (this.subscriptions.ownTrades) {
      this.log({
        message: 'Resubscribe "ownTrades"',
        additional: { name: 'ownTrades', options },
      })

      this.subscribeToOwnTrades(this.subscriptions.ownTrades)
    }

    if (this.subscriptions.openOrders) {
      this.log({
        message: 'Resubscribe "openOrders"',
        additional: { name: 'ownTrades', options },
      })

      this.subscribeToOpenOrders(this.subscriptions.openOrders)
    }
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
  addOrder = sendOrderData => {
    const {
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
    } = sendOrderData

    const { token } = this._options

    this.log({
      message: 'addOrder :: start',
      additional: { token, payload: sendOrderData },
    })

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

    return new Promise((resolve, reject) => {
      let txid
      let unsubscribeAddSuccess
      let unsubscribeAddFailure
      let unsubscribeOrderData

      const orders = {}
      const unsubscribe = () => {
        unsubscribeAddSuccess()
        unsubscribeAddFailure()
        unsubscribeOrderData()
      }

      this.subscribeToOpenOrders().catch(/* noop */ () => null)

      unsubscribeAddSuccess = this.on('kraken:addorder:success', payload => {
        if (payload.reqid !== nextReqid) return 

        txid = payload.txid

        if (orders[txid] && orders[txid].status === 'open') {
          this.log({
            message: 'addOrder :: event success',
            additional: { payload },
          })

          resolve(orders[txid])
          unsubscribe()
        } else {
          this.log({
            message: 'addOrder :: event success but not open',
            additional: { payload },
          })
        }
      })

      unsubscribeOrderData = this.on('kraken:subscription:event', payload => {
        if (payload[1] !== 'openOrders') return 

        const data = payload[0].reduce(
          (curData, curContainer) => ({
            ...curData,
            ...curContainer,
          }),
          {}
        )

        Object.keys(data).forEach(key => {
          if (data[key].status === 'canceled') {
            delete data[key]
          }
        })

        this.log({
          message: 'addOrder :: openOrders subscription event',
          additional: { raw: payload, formatted: data },
        })

        Object.entries(data).forEach(([key, value]) => {
          if (value.status === 'pending') {
            this.log({
              message: 'addOrder :: openOrders subscription event - Setting data of pending order',
              additional: { key, value },
            })

            orders[key] = value
          }
        })

        if (!txid) {
          Object.entries(data).forEach(([key, value]) => {
            if (!orders[key]) {
              this.log({
                message: '@TODO: Something went wrong here!',
                additional: { orders, data },
              })
            }

            const ordersKeyDescr = orders[key] && orders[key].descr ?  orders[key].descr : null
            const valueDesc = value.descr ? value.descr : null

            const curOrderData = {
              txid: key,
              ...orders[key],
              ...value,
              ...(ordersKeyDescr || valueDesc ? {
                descr: {
                  ...(ordersKeyDescr || {}),
                  ...(valueDesc || {}),
                },
              } : {}),
            }

            this.log({
              message: 'addOrder :: openOrders subscription event - No txid yet; adding data',
              additional: { key, value: curOrderData },
            })

            if (value.status === 'open') {
              orders[key] = curOrderData
            }
          })

          return
        }

        if (!data[txid]) {
          this.log({
            message: 'addOrder :: openOrders subscription event - No order with txid yet',
            additional: { raw: payload, formatted: data, orders },
          })

          return
        }

        if (data[txid].status !== 'open') {
          this.log({
            message: 'addOrder :: openOrders subscription event - Ignoring non-open payloads',
            additional: { raw: payload, formatted: data, orders },
          })

          return
        }

        const actualOrder = orders[txid] ? {
          txid,
          ...orders[txid],
          ...data[txid],
          descr: {
            ...orders[txid].descr,
            ...(data[txid].descr ? data[txid].descr : {}),
          },
        } : { txid, ...data[txid] }

        this.log({
          message: 'addOrder :: openOrders subscription event - success!',
          additional: { raw: payload, formatted: data, order: actualOrder },
        })

        unsubscribe()
        resolve(actualOrder)
      })

      unsubscribeAddFailure = this.on('kraken:addorder:failure', payload => {
        if (payload.reqid !== nextReqid) return 

        this.log({
          message: 'addOrder :: failure',
          additional: { payload },
        })

        unsubscribe()
        reject(payload)
      })
    })
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
  cancelOrder = cancelOrderData => {
    const { reqid, txid } = cancelOrderData
    const { token } = this._options

    this.log({
      message: 'cancelOrder :: start',
      additional: { token, payload: cancelOrderData },
    })

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
          this.log({
            message: 'cancelOrder :: event error',
            additional: { payload, counter, total: txids.length },
          })

          failed += 1
        }

        if (counter === txids.length) {
          unsubscribeSuccess()
          unsubscribeFailure()

          if (failed === 0) {
            this.log({
              message: 'cancelOrder :: success; none failed',
              additional: { payload, counter, total: txids.length },
            })
          } else if (failed === txids.length) {
            this.log({
              message: 'cancelOrder :: failure; all failed',
              additional: { payload, counter, total: txids.length },
            })
          } else {
            this.log({
              message: 'cancelOrder :: success/failure; some failed',
              additional: { payload, counter, total: txids.length },
            })
          }

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
  cancelAll = (cancelAllData = {}) => {
    const { reqid } = cancelAllData
    const { token } = this._options

    this.log({
      message: 'cancelAll :: start',
      additional: { token, payload: cancelAllData },
    })

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
      .then(response => {
        this.log({
          message: 'cancelAll :: success',
          additional: { payload: response },
        })

        return response
      })
      .catch(error => {
        this.log({
          message: 'cancelAll :: failure',
          level: 'error',
          additional: { payload: response },
        })

        throw error
      })
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
  subscribe = (name, payload) => {
    let errorMessage
    const { reqid, snapshot } = payload

    this.log({
      message: 'subscribe :: start',
      additional: {
        token: this._options.token,
        payload,
      },
    })

    if (!name) {
      errorMessage = 'You need to provide "name" when subscribing'
    }

    if (!this._options.token) {
      errorMessage = 'You need to initialize this class with a token if you want to access private streams'
    }

    if (this.subscriptions[name]) {
      errorMessage = `You've already subscribed to "${name}"`
    }

    if (errorMessage) {
      this.log({
        message: 'subscribe (private) error',
        additional: { errorMessage },
      })

      return Promise.reject({ errorMessage })
    }

    const { token } = this._options
    const nextReqid = reqid || this._nextReqid++
    this.send({
      event: 'subscribe',
      reqid: nextReqid,
      subscription: { name, reqid, token },
    })

    const checker = _payload => _payload.reqid === nextReqid
    return this._handleSubscription(checker)
      .then(response => {
        this.log({
          message: `Subscription success for name "${name}"`,
          additional: { name, options: payload },
        })

        this.subscriptions[name] = payload

        return response
      })
      .catch(error => {
        this.log({
          message: `Subscription failure for name "${name}"`,
          additional: { name, payload },
        })

        return Promise.reject(error)
      })
  }

  /**
   * @param {Object} args
   * @param {String} args.name
   * @param {Int} [args.reqid]
   * @returns {Promise.<bool>}
   */
  unsubscribe = unsubscribeData => {
    const { name, reqid } = unsubscribeData
    const { token } = this._options

    this.log({
      message: 'unsubscribe :: start',
      additional: { token, payload: unsubscribeData },
    })

    if (!name) {
      const errorMessage = 'You need to provide "name" when unsubscribing'

      this.log({
        message: 'unsubscribe (private) error',
        additional: { errorMessage },
      })

      return Promise.reject({ errorMessage })
    }

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
        this.log({
          message: `Unsubscribe success for name "${name}"`,
          additional: { name, options: payload },
        })

        this.subscriptions[name] = null
        return payload
      })
      .catch(error => {
        this.log({
          message: `Unsubscribe failure for name "${name}"`,
          additional: { name, payload },
        })

        return Promise.reject(error)
      })
  }

  log(data) {
    super.log({ ...data, prefix: 'KrakenWSPrivate :: ' })
  }
}
