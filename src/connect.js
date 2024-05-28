const { Connection } = require('./Connection')

async function connect({ authenticated = false } = {}) {
  const conn = new Connection()
  await conn.connect(authenticated)
  return conn
}

module.exports.connect = connect
