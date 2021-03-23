import { KrakenWS, isValidPublicName } from '../KrakenWS/index'
import { handleSubscriptionEvent } from './handleSubscriptionEvent'
import { handleSubscriptionError } from './handleSubscriptionError'
import { handleSubscriptionSuccess } from './handleSubscriptionSuccess'
import { handleUnsubscriptionError } from './handleUnsubscriptionError'
import { handleUnsubscriptionSuccess } from './handleUnsubscriptionSuccess'

const DEFAULT_OPTIONS = {
  url: 'wss://ws.kraken.com',
}

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
      handleUnsubscriptionError,
    ]
  }

  resubscribe = () => {
    super.resubscribe()

    const { ticker, trade, spread, ohlc, book } = this.subscriptions
    const subscriptions = { ticker, trade, spread, ohlc, book }

    for (const [name, namedSubscriptions] in Object.entries(subscriptions)) {
      for (const [pair, options] in Object.entries(namedSubscriptions)) {
        this.log({
          message: `Resubscribe "${name}" for pair "${pair}"`,
          additional: { name, pair, options },
        })

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
  subscribeToTicker = ({ pair, reqid }) =>
    this.subscribe(pair, 'ticker', { reqid })

  /**
   * @param {Object} options
   * @param {String[]} options.pairs
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToTickerMutliple = ({ pairs, reqid }) =>
    this.subscribeMultiple(pairs, 'ticker', { reqid })

  /**
   * @param {Object} options
   * @param {String} options.pair
   * @param {Int} [options.reqid]
   * @param {Int} [options.interval]
   * @returns {Promise.<bool>}
   */
  subscribeToOHLC = ({ pair, reqid, interval }) =>
    this.subscribe(pair, 'ohlc', { reqid, interval })

  /**
   * @param {Object} options
   * @param {String[]} options.pairs
   * @param {Int} [options.reqid]
   * @param {Int} [options.interval]
   * @returns {Promise.<bool>}
   */
  subscribeToOHLCMultiple = ({ pairs, reqid, interval }) =>
    this.subscribeMultiple(pairs, 'ohlc', { reqid, interval })

  /**
   * @param {String} pair
   * @param {Object} [options]
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToTrade = ({ pair, reqid }) =>
    this.subscribe(pair, 'trade', { reqid })

  /**
   * @param {String[]} pair
   * @param {Object} [options]
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToTradeMultiple = ({ pairs, reqid }) =>
    this.subscribeMultiple(pairs, 'trade', { reqid })

  /**
   * @param {Object} options
   * @param {String} options.pair
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToSpread = ({ pair, reqid }) =>
    this.subscribe(pair, 'spread', { reqid })

  /**
   * @param {Object} options
   * @param {String[]} options.pairs
   * @param {Int} [options.reqid]
   * @returns {Promise.<bool>}
   */
  subscribeToSpreadMultiple = ({ pairs, reqid }) =>
    this.subscribeMultiple(pairs, 'spread', { reqid })

  /**
   * @param {Object} options
   * @param {String} options.pair
   * @param {Int} [options.reqid]
   * @param {Int} [options.depth]
   * @returns {Promise.<bool>}
   */
  subscribeToBook = ({ pair, reqid, depth }) =>
    this.subscribe(pair, 'book', { reqid, depth })

  /**
   * @param {Object} options
   * @param {String[]} options.pairs
   * @param {Int} [options.reqid]
   * @param {Int} [options.depth]
   * @returns {Promise.<bool>}
   */
  subscribeToBookMultiple = ({ pairs, reqid, depth }) =>
    this.subscribeMultiple(pairs, 'book', { reqid, depth })

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
  subscribe = (pair, name, options) => {
    let errorMessage

    this.log({
      message: 'subscribe (public)',
      additional: { name, pair, options },
    })

    if (!name) {
      errorMessage = "You need to provide 'name' when subscribing"
    }

    if (!pair) {
      errorMessage = "You need to provide 'pair' when subscribing"
    }

    if (!isValidPublicName(name)) {
      errorMessage = `Invalid name. Valid names are: 'ticker', 'ohlc', 'trade', 'spread', 'book'. Received '${name}'`
    }

    if (!this._connection) {
      errorMessage = 'Not connected to the websocket'
    }

    if (errorMessage) {
      this.log({
        message: 'subscribe (public) error',
        additional: { errorMessage },
      })

      return Promise.reject({ errorMessage })
    }

    const { reqid, depth, interval, snapshot, token } = options
    const alreadySubscribed = this.subscriptions[name][pair] && pair

    if (alreadySubscribed) {
      errorMessage = 'already subscribed'

      this.log({
        message: 'subscribe (public) error',
        additional: { errorMessage },
      })

      return Promise.reject({ errorMessage, pair, name, options })
    }

    const nextReqid = reqid || this._nextReqid++
    this.send({
      pair: [pair],
      event: 'subscribe',
      reqid: nextReqid,
      subscription: { name, depth, interval, snapshot },
    })

    const checker = payload => payload.reqid === nextReqid

    return this._handleSubscription(checker)
      .then(payload => {
        this.log({
          message: `Subscription success for name "${name}" with pair "${pair}"`,
          additional: { name, pair, options },
        })

        this.subscriptions[name][pair] = options

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
  subscribeMultiple = (pairs, name, options) => {
    let errorMessage

    this.log({
      message: 'subscribe multiple (public)',
      additional: { name, pairs, options },
    })

    const { reqid, depth, interval, snapshot } = options

    if (!name) {
      errorMessage = "You need to provide 'name' when subscribing"
    }

    if (!pairs || !pairs.length) {
      errorMessage = "You need to provide 'pairs' of type String[] when subscribing"
    }

    if (!isValidPublicName(name)) {
      errorMessage = `Invalid name. Valid names are: 'ticker', 'ohlc', 'trade', 'spread', 'book'. Received '${name}'`
    }

    if (errorMessage) {
      this.log({
        message: 'subscribe multiple (public) error',
        additional: { errorMessage },
      })

      return Promise.reject({ errorMessage })
    }

    const alreadySubscribed = pairs.reduce(
      (found, _, pair) => {
        if (found) return found
        return this.subscriptions[name][pair] ? pair : found
      },
      ''
    )

    if (alreadySubscribed) {
      errorMessage = 'already subscribed'

      this.log({
        message: 'subscribe multiple (public) error',
        additional: { errorMessage, pairs, name, options },
      })

      return Promise.reject({ errorMessage })
    }

    const nextReqid = reqid || this._nextReqid++
    this.send({
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
            this.log({
              message: `Subscription success for name "${name}" with pair "${curPair}"`,
              additional: { name, pair: curPair, options },
            })

            this.subscriptions[name][curPair] = options
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
          this.log({
            message: `subscribe multiple (public) error :: all failed`,
            additional: { name, pairs, options },
          })
          return Promise.reject(responses)
        }

        if (failureResponses.length) {
          this.log({
            message: `subscribe multiple (public) error :: some failed`,
            additional: {
              name,
              pairs,
              options,
              successfulResponses,
              failureResponses,
            },
          })
        } else {
          this.log({
            message: `subscribe multiple (public) error :: none failed`,
            additional: { name, pairs, options, successfulResponses },
          })
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
  unsubscribe = ({ pair, name, reqid, options }) => {
    let errorMessage

    this.log({
      message: 'unsubscribe (public)',
      additional: { name, pair, options, reqid },
    })

    if (!name) {
      errorMessage = 'You need to provide "name" when subscribing'
    }

    if (!pair) {
      errorMessage = 'You need to provide "pair" when unsubscribing'
    }

    if (errorMessage) {
      this.log({
        message: 'unsubscribe (public) error',
        additional: { errorMessage },
      })

      return Promise.reject({ errorMessage })
    }

    const nextReqid = reqid || this._nextReqid++
    const response = this.send({
      event: 'unsubscribe',
      reqid: nextReqid,
      subscription: { name, ...options },
      pair: [pair],
    })

    const checker = payload =>
      payload.reqid === nextReqid &&
      payload.pair === pair

    return this._handleUnsubscription(checker)
      .then(payload => {
        this.log({
          message: `Unsubscribe success for name "${name}" with pair "${pair}"`,
          additional: { name, pair, options },
        })

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
    let errorMessage

    this.log({
      message: 'unsubscribe multiple (public)',
      additional: { name, pairs, options, reqid },
    })

    if (!name) {
      errorMessage = 'You need to provide "name" when subscribing'
    }

    if (!pairs.length) {
      errorMessage = 'You need to provide "pair" when unsubscribing'
    }

    if (errorMessage) {
      this.log({
        message: 'unsubscribe multiple (public) error',
        additional: { errorMessage },
      })

      return Promise.reject({ errorMessage })
    }

    const nextReqid = reqid || this._nextReqid++
    const response = this.send({
      event: 'unsubscribe',
      reqid: nextReqid,
      subscription: { ...options, name },
      pair: pairs,
    })

    return Promise.all(
      pairs.map(curPair => {
        const checker = payload => payload.reqid === nextReqid && payload.pair === curPair

        return this._handleUnsubscription(checker)
          .then(payload => {
            this.log({
              message: `Unsubscribe success for name "${name}" with pair "${curPair}"`,
              additional: { name, pair: curPair, options },
            })

            delete this.subscriptions[name][curPair]
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
          this.log({
            message: `unsubscribe multiple (public) error :: all failed`,
            additional: { name, pairs, options },
          })
          return Promise.reject(responses)
        }

        if (failureResponses.length) {
          this.log({
            message: `unsubscribe multiple (public) error :: some failed`,
            additional: {
              name,
              pairs,
              options,
              successfulResponses,
              failureResponses,
            },
          })
        } else {
          this.log({
            message: `unsubscribe multiple (public) error :: none failed`,
            additional: { name, pairs, options, successfulResponses },
          })
        }

        return {
          success: successfulResponses,
          failure: failureResponses,
        }
      }
    )
  }

  log(data) {
    super.log({ ...data, prefix: 'KrakenWSPublic :: ' })
  }
}
