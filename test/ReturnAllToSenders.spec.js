'use strict'

const expect = require('expect')
const rewire = require('rewire')
const sinon = require('sinon')
const privateSettings = require('../src/settings/private.settings.json')

let ReturnAllToSenders = rewire('../src/lib/ReturnAllToSenders')

describe('[ReturnAllToSenders]', () => {
  describe('(run)', () => {
    it('should fail on params', (done) => {
      const callback = (success, data) => {
        expect(success).toBe(false)
        expect(data.message).toBeA('string')
        sinon.assert.calledOnce(mockLogger.writeLog)
        sinon.assert.calledWith(mockLogger.writeLog, 'RATS_001')
        done()
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.run({ junkParam: 1234 }, callback)
    })
    it('should procedd to run getUnspent', (done) => {
      const callback = () => {}
      const softClient = {}
      ReturnAllToSenders.getUnspent = () => {
        expect(ReturnAllToSenders.runtime.callback).toBe(callback)
        expect(ReturnAllToSenders.runtime.softClient).toBe(softClient)
        sinon.assert.notCalled(mockLogger.writeLog)
        done()
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.run({ softClient }, callback)
    })
  })
  describe('(fromList)', () => {
    beforeEach(() => { // reset the rewired functions
      ReturnAllToSenders = rewire('../src/lib/ReturnAllToSenders')
    })
    it('should fail on params', (done) => {
      const callback = (success, data) => {
        expect(success).toBe(false)
        expect(data.message).toBeA('string')
        sinon.assert.calledOnce(mockLogger.writeLog)
        sinon.assert.calledWith(mockLogger.writeLog, 'RATS_001A')
        done()
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.fromList({ junkParam: 1234 }, callback)
    })
    it('should procedd to run returnToSender', (done) => {
      const callback = () => {}
      const softClient = {}
      const transactionsToReturn = [1, 2, 3]
      ReturnAllToSenders.returnToSender = () => {
        expect(ReturnAllToSenders.runtime.callback).toBe(callback)
        expect(ReturnAllToSenders.runtime.softClient).toBe(softClient)
        expect(ReturnAllToSenders.runtime.transactionsToReturn).toBe(transactionsToReturn)
        sinon.assert.notCalled(mockLogger.writeLog)
        done()
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.fromList({ softClient, transactionsToReturn }, callback)
    })
  })
  describe('(getUnspent)', () => {
    beforeEach(() => { // reset the rewired functions
      ReturnAllToSenders = rewire('../src/lib/ReturnAllToSenders')
    })
    it('should fail to get the unspent', (done) => {
      ReturnAllToSenders.runtime = {
        softClient: {
          listUnspent: () => { return Promise.reject({ code: -17 }) },
        },
        callback: (success, data) => {
          expect(success).toBe(false)
          expect(data.message).toBeA('string')
          sinon.assert.calledOnce(mockLogger.writeLog)
          sinon.assert.calledWith(mockLogger.writeLog, 'RATS_002')
          done()
        },
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.getUnspent()
    })
    it('should get unspent but there are none', (done) => {
      ReturnAllToSenders.runtime = {
        softClient: {
          listUnspent: () => { return Promise.resolve([]) },
        },
        callback: (success, data) => {
          expect(success).toBe(false)
          expect(data.message).toBeA('string')
          sinon.assert.notCalled(mockLogger.writeLog)
          done()
        },
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.getUnspent()
    })
    it('should get unspent and call the filter function', (done) => {
      ReturnAllToSenders.runtime = {
        softClient: {
          listUnspent: () => { return Promise.resolve([1, 2, 3]) },
        },
      }
      const SoftCoin = {
        filterUnspent: (options, callback) => {
          expect(callback).toBe(ReturnAllToSenders.unspentFiltered)
          expect(options.unspent).toEqual([1, 2, 3])
          expect(options.client).toBe(ReturnAllToSenders.runtime.softClient)
          expect(options.accountName).toBe(privateSettings.account.INCOMING)
          sinon.assert.notCalled(mockLogger.writeLog)
          done()
        },
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.__set__('SoftCoin', SoftCoin)
      ReturnAllToSenders.getUnspent()
    })
  })
  describe('(unspentFiltered)', () => {
    beforeEach(() => { // reset the rewired functions
      ReturnAllToSenders = rewire('../src/lib/ReturnAllToSenders')
    })
    it('should fail to filter the unspent (returned false)', (done) => {
      ReturnAllToSenders.runtime = {
        softClient: {
          listUnspent: () => { return Promise.reject({ code: -17 }) },
        },
        callback: (success, data) => {
          expect(success).toBe(false)
          expect(data.message).toBeA('string')
          sinon.assert.calledOnce(mockLogger.writeLog)
          sinon.assert.calledWith(mockLogger.writeLog, 'RATS_003')
          done()
        },
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.unspentFiltered(false)
    })
    it('should fail to filter the unspent (no data)', (done) => {
      ReturnAllToSenders.runtime = {
        softClient: {
          listUnspent: () => { return Promise.reject({ code: -17 }) },
        },
        callback: (success, data) => {
          expect(success).toBe(false)
          expect(data.message).toBeA('string')
          sinon.assert.calledOnce(mockLogger.writeLog)
          sinon.assert.calledWith(mockLogger.writeLog, 'RATS_003')
          done()
        },
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.unspentFiltered(true)
    })
    it('should fail to filter the unspent (no currentPending)', (done) => {
      ReturnAllToSenders.runtime = {
        softClient: {
          listUnspent: () => { return Promise.reject({ code: -17 }) },
        },
        callback: (success, data) => {
          expect(success).toBe(false)
          expect(data.message).toBeA('string')
          sinon.assert.calledOnce(mockLogger.writeLog)
          sinon.assert.calledWith(mockLogger.writeLog, 'RATS_003')
          done()
        },
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.unspentFiltered(true, { currentPending: [] })
    })
    it('should get unspent and call the filter function', (done) => {
      ReturnAllToSenders.runtime = {
        softClient: {
          listUnspent: () => { return Promise.resolve([1, 2, 3]) },
        },
      }
      ReturnAllToSenders.returnToSender = () => {
        expect(ReturnAllToSenders.runtime.transactionsToReturn).toEqual([1, 2, 3])
        sinon.assert.notCalled(mockLogger.writeLog)
        done()
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.unspentFiltered(true, { currentPending: [1, 2, 3] })
    })
  })
  describe('(returnToSender)', () => {
    beforeEach(() => { // reset the rewired functions
      ReturnAllToSenders = rewire('../src/lib/ReturnAllToSenders')
    })
    it('should fail because the filtered wasnt an array', (done) => {
      ReturnAllToSenders.runtime = {
        softClient: {
          listUnspent: () => { return Promise.reject({ code: -17 }) },
        },
        transactionsToReturn: 1234,
        callback: (success, data) => {
          expect(success).toBe(true)
          expect(data.message).toBeA('string')
          sinon.assert.notCalled(mockLogger.writeLog)
          done()
        },
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.returnToSender()
    })
    it('should fail because ther were no filtered', (done) => {
      ReturnAllToSenders.runtime = {
        softClient: {
          listUnspent: () => { return Promise.reject({ code: -17 }) },
        },
        transactionsToReturn: [],
        callback: (success, data) => {
          expect(success).toBe(true)
          expect(data.message).toBeA('string')
          sinon.assert.notCalled(mockLogger.writeLog)
          done()
        },
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.returnToSender()
    })
    it('should succeed and call the send function', (done) => {
      ReturnAllToSenders.runtime = {
        softClient: {
          listUnspent: () => { return Promise.reject({ code: -17 }) },
        },
        transactionsToReturn: [1, 2, 3],
        callback: () => {},
      }
      const ReturnToSender = {
        send: (options, callback) => {
          expect(callback).toBe(ReturnAllToSenders.returnedToSender)
          expect(options.transaction).toEqual(1)
          expect(options.client).toBe(ReturnAllToSenders.runtime.softClient)
          sinon.assert.notCalled(mockLogger.writeLog)
          done()
        },
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.__set__('ReturnToSender', ReturnToSender)
      ReturnAllToSenders.returnToSender()
    })
  })
  describe('(returnToSender)', () => {
    beforeEach(() => { // reset the rewired functions
      ReturnAllToSenders = rewire('../src/lib/ReturnAllToSenders')
    })
    it('should log because it send returned false and skip the transaction', (done) => {
      ReturnAllToSenders.runtime = {
        transactionsToReturn: [1, 2, 3, 4],
      }
      ReturnAllToSenders.returnToSender = () => {
        sinon.assert.calledOnce(mockLogger.writeLog)
        sinon.assert.calledWith(mockLogger.writeLog, 'RATS_004')
        expect(ReturnAllToSenders.runtime.transactionsToReturn).toEqual([2, 3, 4])
        done()
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.returnedToSender(false)
    })
    it('should log because there was no rawOutcome and skip the transaction', (done) => {
      ReturnAllToSenders.runtime = {
        transactionsToReturn: [1, 2, 3, 4],
      }
      ReturnAllToSenders.returnToSender = () => {
        sinon.assert.calledOnce(mockLogger.writeLog)
        sinon.assert.calledWith(mockLogger.writeLog, 'RATS_004')
        expect(ReturnAllToSenders.runtime.transactionsToReturn).toEqual([2, 3, 4])
        done()
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.returnedToSender(true, { junkParam: '1234' })
    })
    it('should succeed and move to the next transaction', (done) => {
      ReturnAllToSenders.runtime = {
        transactionsToReturn: [1, 2, 3, 4],
      }
      ReturnAllToSenders.returnToSender = () => {
        sinon.assert.notCalled(mockLogger.writeLog)
        expect(ReturnAllToSenders.runtime.transactionsToReturn).toEqual([2, 3, 4])
        done()
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnAllToSenders.__set__('Logger', mockLogger)
      ReturnAllToSenders.returnedToSender(true, { rawOutcome: '1234' })
    })
  })
})
