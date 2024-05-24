const schemas = require('../schema/index')
const { connect } = require('./connect')
const { disconnect } = require('./disconnect')
const { sendMessage } = require('./sendMessage')
const { validateParams } = require('./validateParams')

const camelToSnakeCase = (camelCase) => camelCase.replace(
  /([a-z0-9])([A-Z])/g,
  (_, preceeding, following) => `${preceeding}_${following.toLowerCase()}`
)

module.exports.nodeKrakenWs = Object.entries(schemas).reduce(
  (acc, [name, fieldSchemas]) => {
    const method = camelToSnakeCase(name)
    const handler = (conn, { params = {}, reqId }) => {
  		validateParams({ params, values: params, fieldSchemas })
  		return sendMessage(conn, { method, params, reqId })
    }

    return { ...acc, [name]: handler }
  },
  { connect, disconnect, sendMessage }
)
