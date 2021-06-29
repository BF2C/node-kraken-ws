import { KrakenWS } from '../KrakenWS/KrakenWS'
import { debug as debugOrig } from '../utils/index'
import { handleAddOrderFailure } from './handleAddOrderFailure'
import { handleAddOrderSuccess } from './handleAddOrderSuccess'
import { handleCancelAllFailure } from './handleCancelAllFailure'
import { handleCancelAllSuccess } from './handleCancelAllSuccess'
import { handleCancelOrderFailure } from './handleCancelOrderFailure'
import { handleCancelOrderSuccess } from './handleCancelOrderSuccess'
import { handleSubscriptionError } from './handleSubscriptionError'
import { handleSubscriptionEvent } from './handleSubscriptionEvent'
import { handleSubscriptionSuccess } from './handleSubscriptionSuccess'
import { handleUnsubscriptionSuccess } from './handleUnsubscriptionSuccess'

const debugKrakenWsPrivate = debugOrig.extend('KrakenWSPrivate')

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
      handleUnsubscriptionSuccess,
    ]
  }

  async reconnect() {
    const debug = debugKrakenWsPrivate.extend('reconnect')
    await super.reconnect()

    const reconnectProcesses = []
    if (this.subscriptions.ownTrades) {
      debug('Resubscribe "ownTrades"')
      reconnectProcesses.push(this.subscribeToOwnTrades({ reconnect: true }))
    }

    if (this.subscriptions.openOrders) {
      debug('Resubscribe "openOrders"')
      reconnectProcesses.push(this.subscribeToOpenOrders({ reconnect: true }))
    }

    await Promise.all(reconnectProcesses)
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
  addOrder(sendOrderData) {
    const debug = debugKrakenWsPrivate.extend('addOrder')
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

    debug(`start; ${JSON.stringify({ token, payload: sendOrderData })}`)

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
      close:
        closeOrdertype || closePrice || closePrice2
          ? {
              ordertype: closeOrdertype,
              price: closePrice,
              price2: closePrice2,
            }
          : undefined,
      trading_agreement,
    })

    return new Promise((resolve, reject) => {
      let txid

      const orders = {}
      const unsubscribe = () => {
        unsubscribeAddSuccess()
        unsubscribeAddFailure()
        unsubscribeOrderData()
      }

      this.subscribeToOpenOrders().catch(/* noop */ () => null)

      const unsubscribeAddSuccess = this.on(
        'kraken:addorder:success',
        payload => {
          if (payload.reqid !== nextReqid) return

          txid = payload.txid

          if (orders[txid] && orders[txid].status === 'open') {
            debug(`event success; ${JSON.stringify({ payload })}`)
            resolve(orders[txid])
            unsubscribe()
          } else {
            debug(
              `event success but not open; ${JSON.stringify({
                payload,
              })}`
            )
          }
        }
      )

      const unsubscribeOrderData = this.on(
        'kraken:subscription:event',
        payload => {
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

          debug(
            `openOrders subscription event; ${JSON.stringify({
              raw: payload,
              formatted: data,
            })}`
          )

          Object.entries(data).forEach(([key, value]) => {
            if (value.status === 'pending') {
              debug(
                `openOrders subscription event - Setting data of pending order; ${JSON.stringify(
                  { key, value }
                )}`
              )

              orders[key] = value
            }
          })

          if (!txid) {
            Object.entries(data).forEach(([key, value]) => {
              if (!orders[key]) {
                debug(
                  `@TODO: Something went wrong here! ${JSON.stringify({
                    orders,
                    data,
                  })}`
                )
              }

              const ordersKeyDescr =
                orders[key] && orders[key].descr ? orders[key].descr : null
              const valueDesc = value.descr ? value.descr : null

              const curOrderData = {
                txid: key,
                ...orders[key],
                ...value,
                ...(ordersKeyDescr || valueDesc
                  ? {
                      descr: {
                        ...(ordersKeyDescr || {}),
                        ...(valueDesc || {}),
                      },
                    }
                  : {}),
              }

              debug(
                `openOrders subscription event - No txid yet; adding data; ${JSON.stringify(
                  { key, value: curOrderData }
                )}`
              )

              if (value.status === 'open') {
                orders[key] = curOrderData
              }
            })

            return
          }

          if (!data[txid]) {
            debug(
              `openOrders subscription event - No order with txid yet; ${JSON.stringify(
                { raw: payload, formatted: data, orders }
              )}`
            )

            return
          }

          if (data[txid].status !== 'open') {
            debug(
              `openOrders subscription event - Ignoring non-open payloads; ${JSON.stringify(
                { raw: payload, formatted: data, orders }
              )}`
            )

            return
          }

          const actualOrder = orders[txid]
            ? {
                txid,
                ...orders[txid],
                ...data[txid],
                descr: {
                  ...orders[txid].descr,
                  ...(data[txid].descr ? data[txid].descr : {}),
                },
              }
            : { txid, ...data[txid] }

          debug(
            `openOrders subscription event - success! ${JSON.stringify({
              raw: payload,
              formatted: data,
              order: actualOrder,
            })}`
          )

          unsubscribe()
          resolve(actualOrder)
        }
      )

      const unsubscribeAddFailure = this.on(
        'kraken:addorder:failure',
        payload => {
          if (payload.reqid !== nextReqid) return

          debug(`failure; ${JSON.stringify({ payload })}`)

          unsubscribe()
          reject(payload)
        }
      )
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
  cancelOrder(cancelOrderData) {
    const debug = debugKrakenWsPrivate.extend('cancelOrder')

    const { reqid, txid } = cancelOrderData
    const { token } = this._options

    debug(
      `start; ${JSON.stringify({
        token,
        payload: cancelOrderData,
      })}`
    )

    const nextReqid = reqid || this._nextReqid++
    const txids = Array.isArray(txid) ? txid : [txid]

    this.send({
      token,
      event: 'cancelOrder',
      reqid: nextReqid,
      txid: txids,
    })

    return new Promise((resolve, reject) => {
      let counter = 0,
        failed = 0

      const callback = payload => {
        if (payload.reqid !== nextReqid) return

        counter += 1

        if (payload.status === 'error') {
          debug(
            `event error; ${JSON.stringify({
              payload,
              counter,
              total: txids.length,
            })}`
          )

          failed += 1
        }

        if (counter === txids.length) {
          unsubscribeSuccess()
          unsubscribeFailure()

          if (failed === 0) {
            debug(
              `success; none failed; ${JSON.stringify({
                payload,
                counter,
                total: txids.length,
              })}`
            )
          } else if (failed === txids.length) {
            debug(
              `failure; all failed; ${JSON.stringify({
                payload,
                counter,
                total: txids.length,
              })}`
            )
          } else {
            debug(
              `success/failure; some failed; ${JSON.stringify({
                payload,
                counter,
                total: txids.length,
              })}`
            )
          }

          failed === 0
            ? resolve()
            : reject({
                failed,
                errorMessage: `Some orders could not be cancelled (${failed}/${counter})`,
                total: counter,
              })
        }
      }

      const unsubscribeSuccess = this.on('kraken:cancelorder:success', callback)
      const unsubscribeFailure = this.on('kraken:cancelorder:failure', callback)
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
  cancelAll(cancelAllData = {}) {
    const debug = debugKrakenWsPrivate.extend('cancelAll')
    const { reqid } = cancelAllData
    const { token } = this._options

    debug(`start; ${JSON.stringify({ token, payload: cancelAllData })}`)

    const nextReqid = reqid || this._nextReqid++

    this.send({
      token,
      event: 'cancelAll',
      reqid: nextReqid,
    })

    return this._handleOneTimeMessageResponse(
      payload => payload.reqid === nextReqid,
      'kraken:cancelall:success',
      'kraken:cancelall:failure'
    )
      .then(response => {
        debug(`success; ${JSON.stringify({ payload: response })}`)

        return response
      })
      .catch(error => {
        debug(`failure; ${JSON.stringify({ payload: error })}`)

        throw error
      })
  }

  /**
   * @param {Object} options
   * @param {Int} [options.reqid]
   * @param {Bool} [options.snapshot]
   * @returns {Promise.<bool>}
   */
  subscribeToOwnTrades({ reqid, snapshot, reconnect } = {}) {
    if (snapshot && typeof snapshot !== 'boolean') {
      throw new Error('"snapshot" must be a boolean')
    }

    return this.subscribe('ownTrades', { reqid, snapshot, reconnect })
  }

  /**
   * @param {Object} options
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToOpenOrders({ reqid, reconnect } = {}) {
    return this.subscribe('openOrders', { reqid, reconnect })
  }

  /**
   * @param {String} name
   * @param {Object} options
   * @param {String} options.token
   * @param {Int} [options.reqid]
   * @param {bool} [options.snapshot]
   * @returns {Promise.<bool>}
   */
  subscribe(name, payload) {
    const debug = debugKrakenWsPrivate.extend('subscribe')
    const { reqid, snapshot, reconnect } = payload

    debug(
      `subscribe :: start; ${JSON.stringify({
        token: this._options.token,
        payload,
      })}`
    )

    if (!name) {
      const message = 'You need to provide "name" when subscribing'
      debug(`${message}; ${JSON.stringify({ payload })}`)
      throw new Error(message)
    }

    if (!this._options.token) {
      const message =
        'You need to initialize this class with a token if you want to access private streams'
      debug(`${message}; ${JSON.stringify({ payload })}`)
      throw new Error(message)
    }

    if (!reconnect && this.subscriptions[name]) {
      const message = `You've already subscribed to "${name}"`
      debug(`${message}; ${JSON.stringify({ payload })}`)
      throw new Error(message)
    }

    const { token } = this._options
    const nextReqid = reqid || this._nextReqid++
    this.send({
      event: 'subscribe',
      reqid: nextReqid,
      subscription: { name, reqid, token, snapshot },
    })

    const checker = _payload => _payload.reqid === nextReqid
    return this._handleSubscription(checker)
      .then(response => {
        debug(
          `Subscription success for name "${name}"; ${JSON.stringify({
            name,
            options: payload,
          })}`
        )

        this.subscriptions[name] = payload

        return response
      })
      .catch(error => {
        debug(
          `Subscription failure for name "${name}"; ${JSON.stringify({
            name,
            payload,
          })}`
        )

        return Promise.reject(error)
      })
  }

  /**
   * @param {Object} args
   * @param {String} args.name
   * @param {Int} [args.reqid]
   * @returns {Promise.<bool>}
   */
  unsubscribe(unsubscribeData) {
    const debug = debugKrakenWsPrivate.extend('unsubscribe')
    const { name, reqid } = unsubscribeData
    const { token } = this._options

    debug(
      `start; ${JSON.stringify({
        token,
        payload: unsubscribeData,
      })}`
    )

    if (!name) {
      const errorMessage = 'You need to provide "name" when unsubscribing'

      debug(`unsubscribe (private) error; ${JSON.stringify({ errorMessage })}`)

      return Promise.reject({ errorMessage })
    }

    const nextReqid = reqid || this._nextReqid++

    this.send({
      event: 'unsubscribe',
      reqid: nextReqid,
      subscription: { name, token },
    })

    const checker = payload => payload.reqid === nextReqid

    return this._handleUnsubscription(checker)
      .then(payload => {
        debug(
          `Unsubscribe success for name "${name}"; ${JSON.stringify({
            name,
            options: payload,
          })}`
        )

        this.subscriptions[name] = null
        return payload
      })
      .catch(error => {
        debug(
          `Unsubscribe failure for name "${name}"; ${JSON.stringify({
            name,
            error,
          })}`
        )

        return Promise.reject(error)
      })
  }
}
