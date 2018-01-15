const lodash = require('lodash')

const privateSettings = require('../settings/private.settings.json')
let Logger = require('./Logger.js') // eslint-disable-line
let SoftCoin = require('./SoftCoin.js') // eslint-disable-line

const PreFlight = {}

PreFlight.run = (options, callback) => {
  const required = ['softClient', 'subClient', 'settings']
  if (lodash.intersection(Object.keys(options), required).length !== required.length) {
    Logger.writeLog('PRE_001', 'invalid options', { options, required })
    callback(false, { message: 'invalid options provided to Preflight.checkSoftBlocks' })
    return
  }

  PreFlight.runtime = {
    callback,
    softClient: options.softClient,
    subClient: options.subClient,
    settings: options.settings,
  }

  SoftCoin.checkBlockHeight({
    client: PreFlight.runtime.softClient,
    blockThreshold: privateSettings.blockThreshold.processing,
  }, PreFlight.softBlocksChecked)
}

PreFlight.softBlocksChecked = (status, data) => {
  if (!status || !data) {
    Logger.writeLog('PRE_002', 'softClient block check failed', { status, data })
    PreFlight.runtime.callback(false, { message: 'softClient block check failed' })
    return
  }
  PreFlight.runtime.softBalance = data.balance
  PreFlight.runtime.softClient.setTxFee(parseFloat(privateSettings.txFee)).then(() => {
    SoftCoin.checkBlockHeight({
      client: PreFlight.runtime.subClient,
      blockThreshold: privateSettings.blockThreshold.processing,
    }, PreFlight.subBlocksChecked)
  })
  .catch((err) => {
    Logger.writeLog('PRE_003', 'failed to set SOFT tx fee', { err })
    PreFlight.runtime.callback(false, { message: 'failed to set SOFT tx fee' })
    return
  })
}

PreFlight.subBlocksChecked = (status, data) => {
  if (!status || !data) {
    Logger.writeLog('PRE_004', 'subClient block check failed', { status, data })
    PreFlight.runtime.callback(false, { message: 'subClient block check failed' })
    return
  }
  PreFlight.runtime.subBalance = data.balance
  SoftCoin.unlockWallet({
    settings: PreFlight.runtime.settings,
    client: PreFlight.runtime.softClient,
    type: 'softCoin',
  }, PreFlight.softClientUnlocked)
}

PreFlight.softClientUnlocked = (status, data) => {
  if (!status) {
    Logger.writeLog('PRE_005', 'softClient failed to unlock', { status, data })
    PreFlight.runtime.callback(false, { message: 'softClient failed to unlock' })
    return
  }
  SoftCoin.unlockWallet({
    settings: PreFlight.runtime.settings,
    client: PreFlight.runtime.subClient,
    type: 'subChain',
  }, PreFlight.subClientUnlocked)
}

PreFlight.subClientUnlocked = (status, data) => {
  if (!status) {
    Logger.writeLog('PRE_006', 'subClient failed to unlock', { status, data })
    PreFlight.runtime.callback(false, { message: 'subClient failed to unlock' })
    return
  }
  PreFlight.runtime.subClient.setTxFee(parseFloat(privateSettings.subChainTxFee)).then(() => {
    PreFlight.runtime.callback(true, {
      softBalance: PreFlight.runtime.softBalance,
      subBalance: PreFlight.runtime.subBalance,
    })
  })
  .catch((err) => {
    Logger.writeLog('PRE_003', 'failed to set SUB tx fee', { err })
    PreFlight.runtime.callback(false, { message: 'failed to set SUB tx fee' })
    return
  })
}

module.exports = PreFlight
