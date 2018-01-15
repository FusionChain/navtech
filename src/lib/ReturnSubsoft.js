const lodash = require('lodash')

let Logger = require('./Logger.js') //eslint-disable-line
let ReturnToSender = require('./ReturnToSender.js') //eslint-disable-line

const ReturnSubsoft = {}

ReturnSubsoft.run = (options, callback) => {
  const required = ['settings', 'subClient', 'transactions']
  if (lodash.intersection(Object.keys(options), required).length !== required.length) {
    Logger.writeLog('RSN_001', 'invalid options', { options, required })
    callback(false, { message: 'invalid options provided to ReturnSubsoft.run' })
    return
  }
  ReturnSubsoft.runtime = {
    callback,
    settings: options.settings,
    subClient: options.subClient,
    transactions: options.transactions,
  }

  ReturnSubsoft.runtime.remainingTransactions = options.transactions
  ReturnSubsoft.sendToIncoming()
}

ReturnSubsoft.sendToIncoming = () => {
  if (ReturnSubsoft.runtime.remainingTransactions.constructor !== Array || ReturnSubsoft.runtime.remainingTransactions.length < 1) {
    ReturnSubsoft.runtime.callback(true, { message: 'all subsoft returned to incoming server' })
    return
  }
  ReturnToSender.send({
    client: ReturnSubsoft.runtime.subClient,
    transaction: ReturnSubsoft.runtime.remainingTransactions[0].transaction,
  }, ReturnSubsoft.sent)
}

ReturnSubsoft.sent = (success, data) => {
  if (!success || !data || !data.rawOutcome) {
    Logger.writeLog('RSN_002', 'unable to return subsoft to incoming server', {
      remaining: ReturnSubsoft.runtime.remainingTransactions, success, data,
    }, true)
    ReturnSubsoft.runtime.callback(false, { message: 'failed to return subsoft' })
    return
  }
  ReturnSubsoft.runtime.remainingTransactions.splice(0, 1)
  ReturnSubsoft.sendToIncoming()
  return
}

module.exports = ReturnSubsoft
