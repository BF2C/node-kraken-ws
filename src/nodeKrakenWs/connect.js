const EventEmitter = require('events')
const WebSocket = require('ws')
const { WS_URL_PUBLIC, WS_URL_PRIVATE } = require('../constants/index')

module.exports.connect = function connect({ authenticated = false } = {}) {
  return new Promise((resolve, reject) => {
    let connected = false
    const emitter = new EventEmitter()
    const url = authenticated ? WS_URL_PRIVATE : WS_URL_PUBLIC
    const ws = new WebSocket(url)
    emitter.ws = ws

    ws.onopen = () => {
      connected = true
      resolve(emitter)
    }

    ws.onerror = (error) => {
      console.log('> error:', error.error)
      if (!connected) {
        reject(error)
      }
    }

    ws.onclose = () => {
      if (!connected) {
        reject(
          new Error('WebSocket closed before a connection was established')
        )
      } else {
        emitter.emit('close')
      }
    }

    ws.onmessage = (raw) => {
      let message

      try {
        message = JSON.parse(message)
      } catch (e) {
        emitter.emit(
          'message:error',
          new Error(`Could not parse message: ${raw}`)
        )
      }

      emitter.emit('message', message)
    }
  })
}
