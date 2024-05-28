module.exports.createResponsePromise = (conn, method, reqId) => {
  return new Promise((resolve, reject) => {
    const handler = (message) => {
      if (typeof reqId !== 'undefined' && reqId !== message.req_id) {
        return
      }

      conn.off(method, handler)

      if (message.success) {
        resolve(message)
      } else {
        reject(message)
      }
    }

    conn.on(method, handler)
  })
}
