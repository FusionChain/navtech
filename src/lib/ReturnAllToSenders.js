const lodash = require('lodash')
const config = require('config')
const globalSettings = config.get('GLOBAL')

let Logger = require('./Logger.js') //eslint-disable-line
let SoftCoin = require('./SoftCoin.js') //eslint-disable-line
const privateSettings = require('../settings/private.settings.json')
let ReturnToSender = require('./ReturnToSender.js')//eslint-disable-line

const ReturnAllToSenders = {}

ReturnAllToSenders.run = (options, callback) => {
  const required = ['softClient']
  if (lodash.intersection(Object.keys(options), required).length !== required.length) {
    Logger.writeLog('RATS_001', 'invalid options', { options, required })
    callback(false, { message: 'invalid options provided to ReturnAllToSenders.run' })
    return
  }
  ReturnAllToSenders.runtime = {
    callback,
    softClient: options.softClient,
  }

  ReturnAllToSenders.getUnspent()
}

ReturnAllToSenders.fromList = (options, callback) => {
  const required = ['softClient', 'transactionsToReturn']
  if (lodash.intersection(Object.keys(options), required).length !== required.length) {
    Logger.writeLog('RATS_001A', 'invalid options', { options, required })
    callback(false, { message: 'invalid options provided to ReturnAllToSenders.fromList' })
  }
  ReturnAllToSenders.runtime = {
    callback,
    softClient: options.softClient,
    transactionsToReturn: options.transactionsToReturn,
  }

  ReturnAllToSenders.returnToSender()
}

ReturnAllToSenders.getUnspent = () => {
  ReturnAllToSenders.runtime.softClient.listUnspent().then((unspent) => {
    if (unspent.length < 1) {
      ReturnAllToSenders.runtime.callback(false, { message: 'no unspent transactions found' })
      return
    }
    SoftCoin.filterUnspent({
      unspent,
      client: ReturnAllToSenders.runtime.softClient,
      accountName: privateSettings.account[globalSettings.serverType],
    },
    ReturnAllToSenders.unspentFiltered)
  }).catch((err) => {
    Logger.writeLog('RATS_002', 'failed to list unspent', err)
    ReturnAllToSenders.runtime.callback(false, { message: 'failed to list unspent' })
    return
  })
}

ReturnAllToSenders.unspentFiltered = (success, data) => {
  if (!success || !data || !data.currentPending || data.currentPending.length < 1) {
    Logger.writeLog('RATS_003', 'failed to filter unspent', data)
    ReturnAllToSenders.runtime.callback(false, { message: 'no current pending to return' })
    return
  }

  ReturnAllToSenders.runtime.transactionsToReturn = data.currentPending
  ReturnAllToSenders.returnToSender()
}

ReturnAllToSenders.returnToSender = () => {
  if (ReturnAllToSenders.runtime.transactionsToReturn.constructor !== Array || ReturnAllToSenders.runtime.transactionsToReturn.length < 1) {
    ReturnAllToSenders.runtime.callback(true, { message: 'all transactions returned to sender' })
    return
  }
  ReturnToSender.send({
    client: ReturnAllToSenders.runtime.softClient,
    transaction: ReturnAllToSenders.runtime.transactionsToReturn[0] },
  ReturnAllToSenders.returnedToSender)
}

ReturnAllToSenders.returnedToSender = (success, data) => {
  if (!success || !data || !data.rawOutcome) {
    Logger.writeLog('RATS_004', 'unable to return to sender', { success, data })
  }
  ReturnAllToSenders.runtime.transactionsToReturn.splice(0, 1)
  ReturnAllToSenders.returnToSender()
  return
}

module.exports = ReturnAllToSenders
