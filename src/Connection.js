const EventEmitter = require('events')
const WebSocket = require('ws')

const WS_URL_PUBLIC = 'wss://ws.kraken.com/v2'
const WS_URL_PRIVATE = 'wss://ws-auth.kraken.com/v2'
const WS_URL_PUBLIC_BETA = 'wss://beta-ws.kraken.com/v2'
const WS_URL_PRIVATE_BETA = 'wss://beta-ws-auth.kraken.com/v2'

function safeParseJson(raw) {
  try {
    const message = JSON.parse(message)
    return { data: message }
  } catch (e) {
    return { error: true }
  }
}

/* BUT WHY?????
 * ============
 *
 * Generally I'm not a fan of inheritance and think that composition is simply
 * superior to inheritance.
 *
 * This is done to allow consumers to simplify listening to events.
 * This library differentiates between snapshot and update messages.
 * By allowing to specify multiple events for the same handler,
 * consumers can do this:
 *
 * conn.on('executions:snapshot executions:update', callback)
 *
 * This is useful when snapshot and update message have the exact same response
 * shape (e.g. the "executions" message).
 */
class BetterEmitter extends EventEmitter {
  on(event, handler) {
    const events = event.split(' ')
    events.forEach((e) => super.on(e, handler))
  }

  off(event, handler) {
    const events = event.split(' ')
    events.forEach((e) => super.off(e, handler))
  }
}
module.exports.BetterEmitter = BetterEmitter

function getWsUrl({ authenticated, beta }) {
  if (authenticated && beta) return WS_URL_PRIVATE_BETA
  if (authenticated) return WS_URL_PRIVATE
  if (beta) return WS_URL_PUBLIC_BETA
  return WS_URL_PUBLIC
}

// Why using a class instead of a plain object?
// ============================================
//
// WebSockets are inherently stateful. As long as a class instance does not
// have to synchronize its state with other stateful entities,
// I'd argue that this is generally OK to do.
//
// Also: This is a convenient way of using the built-in EventEmitter
// functionality without having to write too much code.
// The only reason these classes are exposed to the consumer is to allow
// correct typing if the consumer uses TS, otherwise I wouldn't have exposed
// these classes whatsoever.
//
// @TODO: Maybe there's a way to just expose their types
// without allowing the consumer to use their implementation?
// Probably unnecessary guard against invalid usage. This should simply be
// documented so that any consumer knows that this could break any time
class Connection extends BetterEmitter {
  connect({ authenticated = false, beta = false } = {}) {
    return new Promise((resolve, reject) => {
      let connected = false
      const url = getWsUrl({ authenticated, beta })
      this.ws = new WebSocket(url)

      this.ws.on('open', () => {
        connected = true
        resolve()
      })

      this.ws.on('error', (error) => {
        if (!connected) {
          reject(error)
        } else {
          this.emit('error', error)
        }
      })

      this.ws.on('close', () => {
        if (!connected) {
          reject(
            new Error('WebSocket closed before a connection was established')
          )
        } else {
          this.emit('close')
        }
      })

      this.ws.on('message', (raw) => this.handleMessage(raw))
    })
  }

  handleMessage(raw) {
    const { data: message, error } = safeParseJson(raw)

    if (error) {
      return this.emit(
        'error',
        new Error(`Couldn't parse incoming message, received: ${raw}`)
      )
    }

    // Handle subscription snapshots / updates
    if (['snapshot', 'update'].includes(message.type)) {
      return this.emit(`${message.channel}:${message.type}`, message)
    }

    // handle request responses
    if (message.method) {
      return this.emit(message.method, message)
    }

    // forward any other message
    return this.emit('message', message)
  }

  send(message) {
    return this.ws.send(JSON.stringify(message))
  }

  close() {
    this.ws.close()
  }
}
module.exports.Connection = Connection
