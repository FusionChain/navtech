'use strict'

const Client = require('bitcoin-core')
const express = require('express')
const https = require('https')
const pem = require('pem')
const bodyParser = require('body-parser')
const fs = require('fs')
const config = require('config')
const md5File = require('md5-file')

const IncomingServer = require('./incoming')
const OutgoingServer = require('./outgoing')
const SettingsValidator = require('./lib/SettingsValidator.js')
const SoftCoin = require('./lib/SoftCoin.js')
const EncryptedData = require('./lib/EncryptedData.js')
const RandomizeTransactions = require('./lib/RandomizeTransactions.js')
const EncryptionKeys = require('./lib/EncryptionKeys.js')
const Logger = require('./lib/Logger.js')

// -------- Settings -----------------------------------------------------------

const privateSettings = require('./settings/private.settings')
const globalSettings = config.get('GLOBAL')

let settings = false
if (globalSettings.serverType === 'INCOMING') settings = config.get('INCOMING')
if (globalSettings.serverType === 'OUTGOING') settings = config.get('OUTGOING')

// --------- Initialisation ----------------------------------------------------

Logger.writeLog('SYS_001', 'Server Starting', {
  memes: ['harambe', 'rustled jimmies'],
}, true)

const app = express()

const SoftnodeApi = {}

if (settings) {
  SettingsValidator.validateSettings({ settings }, canInit)
} else {
  Logger.writeLog('APP_001', 'invalid global server type', globalSettings.serverType)
}

function canInit(settingsValid) {
  if (settingsValid) {
    initServer()
  } else {
    Logger.writeLog('APP_002', 'invalid server settings', settings)
  }
}

function initServer() {
  SoftnodeApi.softClient = new Client({
    username: settings.softCoin.user,
    password: settings.softCoin.pass,
    port: settings.softCoin.port,
    host: settings.softCoin.host,
  })

  SoftnodeApi.subClient = new Client({
    username: settings.subChain.user,
    password: settings.subChain.pass,
    port: settings.subChain.port,
    host: settings.subChain.host,
  })

  if (settings.ssl) {
    fs.exists(settings.ssl.key, (keyExists) => {
      fs.exists(settings.ssl.crt, (certExists) => {
        if (!keyExists || !certExists) {
          Logger.writeLog('APP_003', 'unable to find user defined ssl certificate', settings.ssl)
          return
        }
        const sslOptions = {
          key: fs.readFileSync(settings.ssl.key),
          cert: fs.readFileSync(settings.ssl.crt),
          requestCert: false,
          rejectUnauthorized: false,
        }
        app.use(bodyParser.json())
        app.use(bodyParser.urlencoded({
          extended: true,
        }))

        https.createServer(sslOptions, app).listen(settings.local.port, () => {
          setupServer()
        })
      })
    })
  } else {
    pem.createCertificate({ days: 1, selfSigned: true }, (err, keys) => {
      const sslOptions = {
        key: keys.serviceKey,
        cert: keys.certificate,
        requestCert: false,
        rejectUnauthorized: false,
      }
      app.use(bodyParser.json())
      app.use(bodyParser.urlencoded({
        extended: true,
      }))
      https.createServer(sslOptions, app).listen(settings.local.port, () => {
        setupServer()
      })
    })
  }
} // init server

const setupServer = () => {
  if (globalSettings.serverType === 'INCOMING') {
    IncomingServer.init()
    apiInit()
  } else if (globalSettings.serverType === 'OUTGOING') {
    OutgoingServer.init()
    apiInit()
  }
}

const apiInit = () => {
  app.get('/', (req, res) => {
    md5File('dist/softnode.js', (err, hash) => {
      if (err) {
        res.send(JSON.stringify({
          status: 200,
          type: 'FAILURE',
          message: 'error generating md5 hash',
          serverType: globalSettings.serverType,
          error: err,
        }))
        return
      }
      res.send(JSON.stringify({
        status: 200,
        type: 'SUCCESS',
        message: 'server is running!',
        serverType: globalSettings.serverType,
        anonhash: hash,
      }))
    })
  })

  app.post('/api/test-decryption', (req, res) => {
    SoftnodeApi.runtime = {}
    SoftnodeApi.runtime.req = req
    SoftnodeApi.runtime.res = res
    if (!req.body || !req.body.encrypted_data) {
      Logger.writeLog('APP_004', 'failed to receive params', { body: req.body })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_004',
        message: 'failed to receive params',
      }))
      return
    }
    EncryptedData.decryptData({
      encryptedData: SoftnodeApi.runtime.req.body.encrypted_data,
    }, SoftnodeApi.checkDecrypted)
  })

  SoftnodeApi.checkDecrypted = (success, data) => {
    if (!success || !data || !data.decrypted) {
      Logger.writeLog('APP_005', 'unable to derypt the data', { success, data, body: SoftnodeApi.runtime.req.body })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_005',
        message: 'ERROR: unable to decrypt the data',
      }))
      return
    }
    SoftnodeApi.runtime.res.send(JSON.stringify({
      status: 200,
      type: 'SUCCESS',
      message: 'decryption test successful',
    }))
  }

  // ----------- GET SOFT ADDRESSES ---------------------------------------------------------------------------------------------------------

  app.post('/api/get-addresses', (req, res) => {
    SoftnodeApi.runtime = {}
    SoftnodeApi.runtime.req = req
    SoftnodeApi.runtime.res = res

    if (!SoftnodeApi.runtime.req.body ||
      !SoftnodeApi.runtime.req.body.num_addresses ||
      !SoftnodeApi.runtime.req.body.type ||
      !SoftnodeApi.runtime.req.body.account) {
      Logger.writeLog('APP_006', 'failed to receive params', { body: req.body })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_006',
        message: 'ERROR: invalid params',
        body: SoftnodeApi.runtime.req.body,
      }))
      return
    }

    SoftnodeApi.runtime.accountToUse = privateSettings.account[SoftnodeApi.runtime.req.body.account]

    if (!SoftnodeApi.runtime.accountToUse) {
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_006A',
        message: 'ERROR: invalid account',
        body: SoftnodeApi.runtime.req.body,
      }))
    }

    if (globalSettings.serverType === 'OUTGOING') {
      SoftnodeApi.checkIpAddress({ allowedIps: settings.remote }, SoftnodeApi.getAddresses)
      return
    }
    SoftnodeApi.getAddresses()
  })

  SoftnodeApi.getAddresses = () => {
    SoftnodeApi.runtime.numAddresses = parseInt(SoftnodeApi.runtime.req.body.num_addresses, 10)
    if (SoftnodeApi.runtime.req.body.type === 'SUBCHAIN') {
      SoftnodeApi.runtime.clientToUse = SoftnodeApi.subClient
    } else {
      SoftnodeApi.runtime.clientToUse = SoftnodeApi.softClient
    }

    RandomizeTransactions.getRandomAccountAddresses({
      client: SoftnodeApi.runtime.clientToUse,
      accountName: SoftnodeApi.runtime.accountToUse,
      numAddresses: SoftnodeApi.runtime.numAddresses,
    }, SoftnodeApi.returnAddresses)
  }

  SoftnodeApi.returnAddresses = (success, data) => {
    if (!success || !data || !data.pickedAddresses) {
      Logger.writeLog('APP_008', 'failed to pick random addresses', { success, data })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_008',
        message: 'failed to pick random addresses',
      }))
      return
    }
    // Logger.writeLog('APP_TEST_001', 'success get-addresses', { data })
    SoftnodeApi.runtime.res.send(JSON.stringify({
      status: 200,
      type: 'SUCCESS',
      data: {
        addresses: data.pickedAddresses,
      },
    }))
  }

  // ----------- GET SOFT BALANCE -----------------------------------------------------------------------------------------------------------

  app.get('/api/get-soft-balance', (req, res) => {
    SoftnodeApi.runtime = {}
    SoftnodeApi.runtime.req = req
    SoftnodeApi.runtime.res = res

    SoftnodeApi.softClient.getBalance().then((softBalance) => {
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'SUCCESS',
        data: {
          soft_balance: softBalance,
        },
      }))
    })
    .catch((err) => {
      Logger.writeLog('APP_009', 'failed to get the SOFT balance', { error: err })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_009',
        message: 'failed to get the SOFT balance',
      }))
    })
  })

  // ------------------ CHECK AUTHORIZED IP -------------------------------------------

  SoftnodeApi.checkIpAddress = (options, callback) => {
    const remoteIpAddress = SoftnodeApi.runtime.req.connection.remoteAddress || SoftnodeApi.runtime.req.socket.remoteAddress
    let authorized = false
    for (let i = 0; i < options.allowedIps.length; i++) {
      if (remoteIpAddress === options.allowedIps[i].ipAddress || remoteIpAddress === '::ffff:' + options.allowedIps[i].ipAddress) {
        authorized = true
      }
    }

    if (authorized) {
      callback()
    } else {
      Logger.writeLog('APP_025', 'unauthorized access attempt', { remoteIpAddress, remote: options.allowedIps })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_025',
        message: 'unauthorized access attempt',
      }))
    }
  }

  // ------------------ CHECK NODE ---------------------------------------------------------------------------------------------------------

  app.post('/api/check-node', (req, res) => {
    SoftnodeApi.runtime = {}
    SoftnodeApi.runtime.req = req
    SoftnodeApi.runtime.res = res


    if (!SoftnodeApi.runtime.req.body || !SoftnodeApi.runtime.req.body.num_addresses) {
      Logger.writeLog('APP_026', 'failed to receive params', { body: req.body })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_026',
        message: 'failed to receive params',
      }))
      return
    }

    if (globalSettings.serverType === 'INCOMING' && IncomingServer.paused
       || globalSettings.serverType === 'OUTGOING' && OutgoingServer.paused) {
      Logger.writeLog('APP_026A', 'this server is paused for manual recovery', { body: req.body })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_026A',
        message: 'server is not accepting transactions',
      }))
      return
    }

    SoftnodeApi.runtime.numAddresses = parseInt(SoftnodeApi.runtime.req.body.num_addresses, 10)

    if (globalSettings.serverType === 'INCOMING') {
      if (globalSettings.maintenance) {
        SoftnodeApi.checkIpAddress({ allowedIps: globalSettings.allowedIps }, SoftnodeApi.checkSoftBlocks)
        return
      }
      SoftnodeApi.checkSoftBlocks()
      return
    }
    SoftnodeApi.checkIpAddress({ allowedIps: settings.remote }, SoftnodeApi.checkSoftBlocks)
    return
  })

  SoftnodeApi.checkSoftBlocks = () => {
    SoftCoin.checkBlockHeight({
      client: SoftnodeApi.softClient,
      blockThreshold: privateSettings.blockThreshold.checking },
    SoftnodeApi.softBlocksChecked)
  }

  SoftnodeApi.softBlocksChecked = (success, data) => {
    if (!success || !data) {
      Logger.writeLog('APP_027', 'softClient block check failed', { success, data })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_027',
        message: 'softClient block check failed',
      }))
      return
    }
    SoftnodeApi.runtime.softBalance = data.balance
    SoftCoin.checkBlockHeight({
      client: SoftnodeApi.subClient,
      blockThreshold: privateSettings.blockThreshold.checking,
    }, SoftnodeApi.subBlocksChecked)
  }

  SoftnodeApi.subBlocksChecked = (success, data) => {
    if (!success || !data) {
      Logger.writeLog('APP_028', 'subClient block check failed', { success, data })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_028',
        message: 'subClient block check failed',
      }))
      return
    }
    SoftnodeApi.runtime.subBalance = data.balance
    SoftCoin.unlockWallet({ settings, client: SoftnodeApi.softClient, type: 'softCoin' }, SoftnodeApi.unlockSubchain)
  }

  SoftnodeApi.unlockSubchain = (success, data) => {
    if (!success) {
      Logger.writeLog('APP_029', 'softClient failed to unlock', { success, data })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_029',
        message: 'softClient failed to unlock',
      }))
      return
    }
    SoftCoin.unlockWallet({ settings, client: SoftnodeApi.subClient, type: 'subChain' }, SoftnodeApi.getUnspent)
  }

  SoftnodeApi.getUnspent = (success, data) => {
    if (!success) {
      Logger.writeLog('APP_030', 'subClient failed to unlock', { success, data })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_030',
        message: 'subClient failed to unlock',
      }))
      return
    }

    if (globalSettings.serverType === 'OUTGOING') {
      EncryptionKeys.getEncryptionKeys({}, SoftnodeApi.testKeyPair)
      return
    }

    SoftnodeApi.softClient.listUnspent().then((unspent) => {
      if (unspent.length < 1) {
        EncryptionKeys.getEncryptionKeys({}, SoftnodeApi.testKeyPair)
        return
      }
      SoftCoin.filterUnspent({
        unspent,
        client: SoftnodeApi.softClient,
        accountName: privateSettings.account[globalSettings.serverType],
      },
      SoftnodeApi.processFiltered)
    }).catch((err) => {
      Logger.writeLog('APP_030A', 'failed to get unspent from the softClient', { error: err })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_030A',
        message: 'failed to get unspent from the softClient',
      }))
      return
    })
  }

  SoftnodeApi.processFiltered = (success, data) => {
    if (!success) {
      Logger.writeLog('APP_030C', 'failed to filter the unspent', { success, data })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_030C',
        message: 'failed to filter the unspent',
      }))
      return
    }

    let highestConf = 0

    if (data.currentPending && data.currentPending.length > 0) {
      for (const pending of data.currentPending) {
        if (pending.confirmations > highestConf) {
          highestConf = pending.confirmations
        }
      }
      if (highestConf > privateSettings.maxQueue) {
        Logger.writeLog('APP_030B', 'the queue is too long', { highestConf }, true)
        SoftnodeApi.runtime.res.send(JSON.stringify({
          status: 200,
          type: 'FAIL',
          code: 'APP_030B',
          message: 'the queue is too long',
        }))
        return
      }
    }
    EncryptionKeys.getEncryptionKeys({}, SoftnodeApi.testKeyPair)
  }


  SoftnodeApi.testKeyPair = (success, data) => {
    if (!success || !data || !data.privKeyFile || !data.pubKeyFile) {
      Logger.writeLog('APP_031', 'failed to get the current keys', { success, data })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_031',
        message: 'failed to get the current keys',
      }))
      return
    }

    EncryptionKeys.testKeyPair({
      pubKeyFile: data.pubKeyFile,
      privKeyFile: data.privKeyFile,
    }, SoftnodeApi.testedKeypair)
  }

  SoftnodeApi.testedKeypair = (success, data) => {
    if (!success || !data || !data.publicKey) {
      Logger.writeLog('APP_032', 'failed to encrypt with selected keypair', { success, data })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_032',
        message: 'failed to encrypt with selected keypair',
      }))
      return
    }

    SoftnodeApi.runtime.publicKey = data.publicKey
    RandomizeTransactions.getRandomAccountAddresses({
      client: SoftnodeApi.softClient,
      accountName: privateSettings.account[globalSettings.serverType],
      numAddresses: SoftnodeApi.runtime.numAddresses,
    }, SoftnodeApi.hasRandomAddresses)
  }

  SoftnodeApi.hasRandomAddresses = (success, data) => {
    if (!success || !data || !data.pickedAddresses) {
      Logger.writeLog('APP_033', 'failed to retrieve soft addresses', { success, data })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_033',
        message: 'failed to retrieve soft addresses',
      }))
      return
    }

    SoftnodeApi.runtime.softAddresses = data.pickedAddresses
    SoftnodeApi.getHash()
  }

  SoftnodeApi.hasRandomSubAddresses = (success, data) => {
    if (!success || !data || !data.pickedAddresses) {
      Logger.writeLog('APP_034', 'failed to retrieve subchain addresses', { success, data })
      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'FAIL',
        code: 'APP_034',
        message: 'failed to retrieve subchain addresses',
      }))
      return
    }
    SoftnodeApi.runtime.subAddresses = data.pickedAddresses
    SoftnodeApi.getHash()
  }

  SoftnodeApi.getHash = () => {
    md5File('dist/softnode.js', (err, hash) => {
      if (err) {
        Logger.writeLog('APP_035A', 'error generating md5 hash', { err, hash })
        SoftnodeApi.runtime.res.send(JSON.stringify({
          status: 200,
          type: 'FAILURE',
          message: 'error generating md5 hash',
          serverType: globalSettings.serverType,
          error: err,
        }))
        return
      }
      SoftnodeApi.returnCheckedNode(hash)
    })
  }

  SoftnodeApi.returnCheckedNode = (hash) => {
    const localHost = settings.local.host ? settings.local.host : settings.local.ipAddress

    const returnData = {
      soft_balance: SoftnodeApi.runtime.softBalance,
      sub_balance: SoftnodeApi.runtime.subBalance,
      public_key: SoftnodeApi.runtime.publicKey,
      server_type: globalSettings.serverType,
      min_amount: settings.minAmount,
      max_amount: settings.maxAmount,
      transaction_fee: settings.anonFeePercent,
      server: localHost,
      server_port: settings.local.port ? settings.local.port : 443,
      md5: hash,
    }

    returnData.soft_addresses = SoftnodeApi.runtime.softAddresses

    // Logger.writeLog('APP_TEST_002', 'success check-node', {
    //   returnData,
    //   request: SoftnodeApi.runtime.req.body,
    // })

    SoftnodeApi.runtime.res.send(JSON.stringify({
      status: 200,
      type: 'SUCCESS',
      data: returnData,
    }))
  }

  // @TODO check if server paused before returning as valid incoming server

  // -------------- CHECK IF SERVER IS PROCESSING ------------------------------------------------------------------------------------------

  app.get('/api/status', (req, res) => {
    SoftnodeApi.runtime = {}
    SoftnodeApi.runtime.req = req
    SoftnodeApi.runtime.res = res

    if (globalSettings.serverType === 'INCOMING') {
      const now = new Date()
      const diff = now - IncomingServer.runtime.cycleStart
      const timeRemaining = settings.scriptInterval - diff

      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'SUCCESS',
        data: {
          processing: IncomingServer.processing,
          paused: IncomingServer.paused,
          nextCycleStart: Math.round(timeRemaining / 1000) + ' seconds',
        },
      }))
    } else if (globalSettings.serverType === 'OUTGOING') {
      const now = new Date()
      const diff = now - OutgoingServer.runtime.cycleStart
      const timeRemaining = settings.scriptInterval - diff

      SoftnodeApi.runtime.res.send(JSON.stringify({
        status: 200,
        type: 'SUCCESS',
        data: {
          processing: OutgoingServer.processing,
          paused: OutgoingServer.paused,
          nextCycleStart: Math.round(timeRemaining / 1000) + ' seconds',
        },
      }))
    }
  })
} // apiInit
