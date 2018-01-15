const lodash = require('lodash')

let Logger = require('./Logger.js') // eslint-disable-line
let SendToAddress = require('./SendToAddress.js') // eslint-disable-line
const privateSettings = require('../settings/private.settings.json')

const PayoutFee = {}

PayoutFee.run = (options, callback) => {
  const required = ['settings', 'softClient']
  if (lodash.intersection(Object.keys(options), required).length !== required.length) {
    Logger.writeLog('PAY_001', 'invalid options', { options, required })
    callback(false, { message: 'invalid options provided to PayoutFee.run' })
    return
  }
  PayoutFee.runtime = {
    callback,
    settings: options.settings,
    softClient: options.softClient,
  }
  PayoutFee.send()
}

PayoutFee.send = () => {
  PayoutFee.runtime.softClient.listUnspent(200).then((unspent) => {
    let softBalanceSat = 0
    const satoshiFactor = 100000000
    for (const pending of unspent) {
      softBalanceSat += Math.round(pending.amount * satoshiFactor)
    }
    const softBalance = softBalanceSat / satoshiFactor
    if (softBalance < PayoutFee.runtime.settings.softPoolAmount) {
      Logger.writeLog('PAY_002', 'soft pool balance less than expected', {
        softPoolAmount: PayoutFee.runtime.settings.softPoolAmount,
        softBalance,
      })
      PayoutFee.runtime.callback(false, { message: 'soft pool balance less than expected' })
      return
    }

    const txFeeAccrued = (softBalance - PayoutFee.runtime.settings.softPoolAmount) - privateSettings.txFee
    if (txFeeAccrued < PayoutFee.runtime.settings.txFeePayoutMin) {
      PayoutFee.runtime.callback(false, { message: 'fee accrued less than payout minimum' })
      return
    }
    SendToAddress.send({
      client: PayoutFee.runtime.softClient,
      address: PayoutFee.runtime.settings.anonTxFeeAddress,
      amount: txFeeAccrued,
      transaction: { txid: 'TX_FEE_PAYOUT' },
    }, PayoutFee.sent)
  }).catch((err) => {
    Logger.writeLog('PAY_002A', 'error getting balance', { error: err })
    PayoutFee.runtime.callback(false, { message: 'error getting balance' })
    return
  })
}

PayoutFee.sent = (success, data) => {
  if (!success) {
    PayoutFee.runtime.callback(false, { message: 'failed to send fee payout' })
    return
  }
  PayoutFee.runtime.callback(true, data)
}

module.exports = PayoutFee
