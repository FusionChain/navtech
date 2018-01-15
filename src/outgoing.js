'use strict'

const Client = require('bitcoin-core')

let Logger = require('./lib/Logger.js') //eslint-disable-line
let EncryptionKeys = require('./lib/EncryptionKeys.js') //eslint-disable-line
let PreFlight = require('./lib/PreFlight.js') //eslint-disable-line
let PrepareOutgoing = require('./lib/PrepareOutgoing.js') //eslint-disable-line
let ProcessOutgoing = require('./lib/ProcessOutgoing.js') //eslint-disable-line
let PayoutFee = require('./lib/PayoutFee') //eslint-disable-line
let ReturnSubsoft = require('./lib/ReturnSubsoft') //eslint-disable-line

const config = require('config')

let settings = config.get('OUTGOING') //eslint-disable-line

// -------------- RUN OUTGOING SERVER ------------------------------------------

const OutgoingServer = {
  processing: false,
  paused: false,
  runtime: {},
}

// --------- Client Initialisation ---------------------------------------------

OutgoingServer.init = () => {
  OutgoingServer.softClient = new Client({
    username: settings.softCoin.user,
    password: settings.softCoin.pass,
    port: settings.softCoin.port,
    host: settings.softCoin.host,
  })

  OutgoingServer.subClient = new Client({
    username: settings.subChain.user,
    password: settings.subChain.pass,
    port: settings.subChain.port,
    host: settings.subChain.host,
  })

  Logger.writeLog('OUT_000', 'server starting')
  EncryptionKeys.findKeysToRemove({ type: 'private' }, OutgoingServer.startProcessing)
  OutgoingServer.cron = setInterval(() => {
    if (OutgoingServer.paused === false) {
      EncryptionKeys.findKeysToRemove({ type: 'private' }, OutgoingServer.startProcessing)
    } else {
      Logger.writeLog('OUT_001', 'processing paused', { paused: OutgoingServer.paused })
    }
  }, settings.scriptInterval)
}

OutgoingServer.startProcessing = () => {
  if (OutgoingServer.processing) {
    Logger.writeLog('OUT_002', 'server still processing', { processing: OutgoingServer.processing })
    return
  }
  OutgoingServer.processing = true
  OutgoingServer.runtime = {}
  OutgoingServer.runtime.cycleStart = new Date()
  PreFlight.run({
    softClient: OutgoingServer.softClient,
    subClient: OutgoingServer.subClient,
    settings,
  }, OutgoingServer.preFlightComplete)
}

OutgoingServer.preFlightComplete = (success, data) => {
  if (!success) {
    Logger.writeLog('OUT_003', 'preflight checks failed', { success, data }, true)
    OutgoingServer.processing = false
    return
  }
  OutgoingServer.runtime.softBalance = data.softBalance
  OutgoingServer.runtime.subBalance = data.subBalance
  PayoutFee.run({
    softClient: OutgoingServer.softClient,
    settings,
  }, OutgoingServer.feePaid)
}

OutgoingServer.feePaid = (success, data) => {
  if (!success) {
    Logger.writeLog('OUT_006', 'failed soft send to txfee address', { data, success })
  }
  OutgoingServer.softClient.getBalance().then((softBalance) => {
    OutgoingServer.runtime.softBalance = softBalance
    PrepareOutgoing.run({
      softClient: OutgoingServer.softClient,
      subClient: OutgoingServer.subClient,
      softBalance,
      settings,
    }, OutgoingServer.currentBatchPrepared)
  }).catch((err) => {
    Logger.writeLog('OUT_006A', 'failed soft send to getbalance after sending tx-fee', { data, err })
    OutgoingServer.processing = false
    return
  })
}

OutgoingServer.currentBatchPrepared = (success, data) => {
  if (!success || !data || !data.currentBatch || data.currentBatch.length === 0) {
    if (data.failedSubTransactions && data.failedSubTransactions.length > 0) {
      Logger.writeLog('OUT_003A', 'failed to prepare some subtransactions', { success, data }, true)
    }
    OutgoingServer.processing = false
    return
  }

  OutgoingServer.runtime.failedSubTransactions = data.failedSubTransactions
  OutgoingServer.runtime.currentBatch = data.currentBatch

  ProcessOutgoing.run({
    currentBatch: OutgoingServer.runtime.currentBatch,
    softClient: OutgoingServer.softClient,
    settings,
  }, OutgoingServer.transactionsProcessed)
}

OutgoingServer.transactionsProcessed = (success, data) => {
  if (!success || !data) {
    Logger.writeLog('OUT_004', 'failed to process transactions', { success, data }, true)
    OutgoingServer.processing = false
    OutgoingServer.paused = true
    return
  }

  if (!data.successfulTransactions || data.successfulTransactions.length < 1) {
    Logger.writeLog('OUT_005', 'all transactions failed', data, true)
    OutgoingServer.processing = false
    OutgoingServer.paused = true
    return
  }

  if (data.failedTransactions && data.failedTransactions.length > 0) {
    Logger.writeLog('OUT_005A', 'failed to send send some transactions', { success, data }, true)
  }

  OutgoingServer.runtime.successfulTransactions = data.successfulTransactions

  ReturnSubsoft.run({
    transactions: OutgoingServer.runtime.successfulTransactions,
    subClient: OutgoingServer.subClient,
    settings,
  }, OutgoingServer.subsoftReturned)
}

OutgoingServer.subsoftReturned = (success, data) => {
  if (!success) {
    Logger.writeLog('OUT_007', 'unable to return subsoft to incoming server', {
      transactions: OutgoingServer.runtime.successfulTransactions,
      data,
    }, true)
    OutgoingServer.paused = true
    OutgoingServer.processing = false
    return
  }

  OutgoingServer.processing = false
  return
}

module.exports = OutgoingServer
