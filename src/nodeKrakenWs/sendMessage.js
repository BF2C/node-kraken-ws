module.exports.sendMessage =
  function sendMessage(conn, { method, params, reqId }) {
    conn.ws.send(JSON.stringify({ method, params, reqId }))
  }
