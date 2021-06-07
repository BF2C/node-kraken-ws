import { KrakenWS, isValidPublicName } from '../KrakenWS/index'
import { debug as debugOrig } from '../utils/index'
import { handleSubscriptionError } from './handleSubscriptionError'
import { handleSubscriptionEvent } from './handleSubscriptionEvent'
import { handleSubscriptionSuccess } from './handleSubscriptionSuccess'
import { handleUnsubscriptionSuccess } from './handleUnsubscriptionSuccess'

const DEFAULT_OPTIONS = {
  url: 'wss://ws.kraken.com',
}

const VALID_DEPTHS = [10, 25, 100, 500, 1000]
const validateDepth = depth => {
  if (typeof depth === 'undefined') return true
  if (typeof depth !== 'number') return false
  return VALID_DEPTHS.includes(depth)
}

const VALID_INTERVALS = [1, 5, 15, 30, 60, 240, 1440, 10080, 21600]
const validateInterval = interval => {
  if (typeof interval !== 'number') return false
  return VALID_INTERVALS.includes(interval)
}

const debugKrakenWsPublic = debugOrig.extend('KrakenWSPublic')

export class KrakenWSPublic extends KrakenWS {
  /**
   * @constructor
   * @param {Object} options
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

    this._options = {
      ...DEFAULT_OPTIONS,
      ...this._options,
    }

    this.subscriptions = {
      ...this.subscriptions,
      ticker: {},
      trade: {},
      spread: {},
      ohlc: {},
      book: {},
    }

    this.socketMessageHandlers = [
      ...this.socketMessageHandlers,
      handleSubscriptionEvent,
      handleSubscriptionError,
      handleSubscriptionSuccess,
      handleUnsubscriptionSuccess,
    ]
  }

  resubscribe() {
    super.resubscribe()

    for (const [name, namedSubscriptions] of Object.entries(
      this.subscriptions
    )) {
      // eslint-disable-next-line prefer-const
      for (let [pair, options] of Object.entries(namedSubscriptions)) {
        options = { ...options, reconnect: true }

        debugKrakenWsPublic(
          `Resubscribe "${name}" for pair "${pair}"; ${JSON.stringify({
            name,
            pair,
            options,
          })}`
        )

        this.subscribe(pair, name, options)
      }
    }
  }

  /**
   * @param {Object} options
   * @param {String} options.pair
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToTicker({ pair, reqid }) {
    if (!pair) {
      throw new Error('Needs pair')
    }

    return this.subscribe(pair, 'ticker', { reqid })
  }

  /**
   * @param {Object} options
   * @param {String} options.pair
   * @param {Int} options.interval
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToOHLC({ pair, reqid, interval }) {
    if (!pair) {
      throw new Error('Needs pair')
    }

    if (!validateInterval(interval)) {
      const msg = `"interval" must be one of: ${VALID_INTERVALS.join(', ')}`
      throw new Error(msg)
    }

    return this.subscribe(pair, 'ohlc', { reqid, interval })
  }

  /**
   * @param {String} pair
   * @param {Object} [options]
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToTrade({ pair, reqid }) {
    if (!pair) {
      throw new Error('Needs pair')
    }

    return this.subscribe(pair, 'trade', { reqid })
  }

  /**
   * @param {Object} options
   * @param {String} options.pair
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToSpread({ pair, reqid }) {
    if (!pair) {
      throw new Error('Needs pair')
    }

    return this.subscribe(pair, 'spread', { reqid })
  }

  /**
   * @param {Object} options
   * @param {String} options.pair
   * @param {Int} [options.reqid]
   * @param {Int} [options.depth]
   * @returns {Promise.<bool>}
   */
  subscribeToBook({ pair, reqid, depth }) {
    if (!pair) {
      throw new Error('Needs pair')
    }

    if (!validateDepth(depth)) {
      throw new Error(`"depth" must be one of: ${VALID_DEPTHS.join(', ')}`)
    }

    return this.subscribe(pair, 'book', { reqid, depth })
  }

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
    const debug = debugKrakenWsPublic.extend('subscribe')
    const logError = message => {
      debug(`${message}; ${JSON.stringify({ pair, name, options })}`)
      return message
    }

    debug(`${JSON.stringify({ name, pair, options })}`)

    if (!pair) {
      const msg = logError("You need to provide 'pair' when subscribing")
      return Promise.reject(new Error(msg))
    }

    if (!name) {
      const msg = logError("You need to provide 'name' when subscribing")
      return Promise.reject(new Error(msg))
    }

    if (!options) {
      const msg = logError("You need to provide 'options' when subscribing")
      return Promise.reject(new Error(msg))
    }

    if (!(options instanceof Object)) {
      const msg = logError('"options" needs to be an object')
      return Promise.reject(new Error(msg))
    }

    if (!isValidPublicName(name)) {
      const msg = logError(
        `Invalid name. Valid names are: 'ticker', 'ohlc', 'trade', 'spread', 'book'. Received '${name}'`
      )
      return Promise.reject(new Error(msg))
    }

    if (!this._connection) {
      const msg = logError('Not connected to the websocket')
      return Promise.reject(new Error(msg))
    }

    const { reqid, depth, interval, snapshot, reconnect } = options
    const alreadySubscribed = this.subscriptions[name][pair]

    if (alreadySubscribed && !reconnect) {
      const msg = logError('already subscribed')
      return Promise.reject(new Error(msg))
    }

    const nextReqid = reqid || this._nextReqid++
    this.send({
      pair: [pair],
      event: 'subscribe',
      reqid: nextReqid,
      subscription: { name, depth, interval, snapshot },
    })

    const checker = payload => {
      return payload.reqid === nextReqid
    }

    return this._handleSubscription(checker).then(payload => {
      debugKrakenWsPublic(
        `Subscription success for name "${name}" with pair "${pair}"; ${JSON.stringify(
          { name, pair, options }
        )}`
      )

      this.subscriptions[name][pair] = options

      return {
        ...payload,
        unsubscribe: () => this.unsubscribe({ pair, name, options }),
      }
    })
  }

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
    const debug = debugKrakenWsPublic.extend('unsubscribe')
    let errorMessage

    debug(`${JSON.stringify({ name, pair, options, reqid })}`)

    if (!name) {
      errorMessage = 'You need to provide "name" when subscribing'
    }

    if (!pair) {
      errorMessage = 'You need to provide "pair" when unsubscribing'
    }

    if (errorMessage) {
      debug(`error; ${JSON.stringify({ errorMessage })}`)

      return Promise.reject({ errorMessage })
    }

    const nextReqid = reqid || this._nextReqid++
    this.send({
      event: 'unsubscribe',
      reqid: nextReqid,
      subscription: { name, ...options },
      pair: [pair],
    })

    const checker = payload =>
      payload.reqid === nextReqid && payload.pair === pair

    return this._handleUnsubscription(checker).then(payload => {
      debug(
        `Unsubscribe success for name "${name}" with pair "${pair}"; ${JSON.stringify(
          { name, pair, options }
        )}`
      )

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
  unsubscribeMultiple({ pairs, name, reqid, options }) {
    const debug = debugKrakenWsPublic.extend('unsubscribeMultiple')
    let errorMessage

    debug(
      JSON.stringify({
        name,
        pairs,
        options,
        reqid,
      })
    )

    if (!name) {
      errorMessage = 'You need to provide "name" when subscribing'
    }

    if (!pairs.length) {
      errorMessage = 'You need to provide "pair" when unsubscribing'
    }

    if (errorMessage) {
      debug(
        `error; ${JSON.stringify({
          errorMessage,
        })}`
      )

      return Promise.reject({ errorMessage })
    }

    const nextReqid = reqid || this._nextReqid++
    this.send({
      event: 'unsubscribe',
      reqid: nextReqid,
      subscription: { ...options, name },
      pair: pairs,
    })

    return Promise.all(
      pairs.map(curPair => {
        const checker = payload =>
          payload.reqid === nextReqid && payload.pair === curPair

        return (
          this._handleUnsubscription(checker)
            .then(payload => {
              debug(
                `Unsubscribe success for name "${name}" with pair "${curPair}"; ${JSON.stringify(
                  { name, pair: curPair, options }
                )}`
              )

              delete this.subscriptions[name][curPair]
              return payload
            })
            // will be handles in the next `.then` step
            // We just need to make sure they're not added to `this.subscriptions`
            .catch(payload => {
              return payload
            })
        )
      })
    ).then(
      /*
       * This will divide the responses into successful and failed responses.
       * If none of the subscriptions was successful, the promise will reject
       */
      responses => {
        const successfulResponses = responses.filter(
          response => !response.errorMessage
        )
        const failureResponses = responses.filter(
          response => !!response.errorMessage
        )

        if (!successfulResponses.length) {
          debug(
            `unsubscribe multiple (public) error :: all failed; ${JSON.stringify(
              { name, pairs, options }
            )}`
          )
          return Promise.reject(responses)
        }

        if (failureResponses.length) {
          debug(
            `unsubscribe multiple (public) error :: some failed; ${JSON.stringify(
              { name, pairs, options, successfulResponses, failureResponses }
            )}`
          )
        } else {
          debug(
            `unsubscribe multiple (public) error :: none failed; ${JSON.stringify(
              { name, pairs, options, successfulResponses }
            )}`
          )
        }

        return {
          success: successfulResponses,
          failure: failureResponses,
        }
      }
    )
  }
}
