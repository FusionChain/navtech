'use strict'

const expect = require('expect')
const rewire = require('rewire')
const sinon = require('sinon')

let ReturnSubsoft = rewire('../src/lib/ReturnSubsoft')

describe('[ReturnSubsoft]', () => {
  describe('(run)', () => {
    it('should fail on params', (done) => {
      const callback = (success, data) => {
        expect(success).toBe(false)
        expect(data.message).toBeA('string')
        sinon.assert.calledOnce(mockLogger.writeLog)
        sinon.assert.calledWith(mockLogger.writeLog, 'RSN_001')
        done()
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnSubsoft.__set__('Logger', mockLogger)
      ReturnSubsoft.run({ junkParam: 1234 }, callback)
    })
    it('should have the right params and call sendToIncoming', (done) => {
      const callback = () => {}
      const subClient = {}
      const settings = {}
      ReturnSubsoft.sendToIncoming = () => {
        expect(ReturnSubsoft.runtime.callback).toBe(callback)
        expect(ReturnSubsoft.runtime.subClient).toBe(subClient)
        expect(ReturnSubsoft.runtime.transactions).toEqual([1, 2, 3, 4])
        expect(ReturnSubsoft.runtime.settings).toBe(settings)
        sinon.assert.notCalled(mockLogger.writeLog)
        done()
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnSubsoft.__set__('Logger', mockLogger)
      ReturnSubsoft.run({ transactions: [1, 2, 3, 4], settings, subClient }, callback)
    })
  })
  describe('(sendToIncoming)', () => {
    beforeEach(() => { // reset the rewired functions
      ReturnSubsoft = rewire('../src/lib/ReturnSubsoft')
    })
    it('should call the callback when theres no transactions left', (done) => {
      ReturnSubsoft.runtime = {
        remainingTransactions: [],
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
      ReturnSubsoft.__set__('Logger', mockLogger)
      ReturnSubsoft.sendToIncoming()
    })
    it('should have transactions to return so call the send function', (done) => {
      ReturnSubsoft.runtime = {
        remainingTransactions: [{ transaction: 1 }, { transaction: 2 }],
        subClient: {},
      }
      const ReturnToSender = {
        send: (options, callback) => {
          expect(callback).toBe(ReturnSubsoft.sent)
          expect(options.client).toBe(ReturnSubsoft.runtime.subClient)
          expect(options.transaction).toEqual(1)
          sinon.assert.notCalled(mockLogger.writeLog)
          done()
        },
      }
      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnSubsoft.__set__('Logger', mockLogger)
      ReturnSubsoft.__set__('ReturnToSender', ReturnToSender)
      ReturnSubsoft.sendToIncoming()
    })
  })
  describe('(sent)', () => {
    beforeEach(() => { // reset the rewired functions
      ReturnSubsoft = rewire('../src/lib/ReturnSubsoft')
    })
    it('should fail because it couldnt return subsoft (returned false)', (done) => {
      ReturnSubsoft.runtime = {
        remainingTransactions: [1, 2, 3, 4],
      }
      ReturnSubsoft.runtime = {
        callback: (success, data) => {
          expect(success).toBe(false)
          expect(data.message).toBeA('string')
          sinon.assert.calledOnce(mockLogger.writeLog)
          sinon.assert.calledWith(mockLogger.writeLog, 'RSN_002')
          done()
        },
      }

      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnSubsoft.__set__('Logger', mockLogger)
      ReturnSubsoft.sent(false)
    })
    it('should fail because it couldnt return subsoft (no rawOutcome)', (done) => {
      ReturnSubsoft.runtime = {
        remainingTransactions: [1, 2, 3, 4],
      }
      ReturnSubsoft.runtime = {
        callback: (success, data) => {
          expect(success).toBe(false)
          expect(data.message).toBeA('string')
          sinon.assert.calledOnce(mockLogger.writeLog)
          sinon.assert.calledWith(mockLogger.writeLog, 'RSN_002')
          done()
        },
      }

      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnSubsoft.__set__('Logger', mockLogger)
      ReturnSubsoft.sent(true, { junkParam: '1234' })
    })
    it('should succeed and proceed to the next subsoft transaction', (done) => {
      ReturnSubsoft.runtime = {
        remainingTransactions: [1, 2, 3, 4],
      }
      ReturnSubsoft.sendToIncoming = () => {
        expect(ReturnSubsoft.runtime.remainingTransactions).toEqual([2, 3, 4])
        sinon.assert.notCalled(mockLogger.writeLog)
        done()
      }

      const mockLogger = {
        writeLog: sinon.spy(),
      }
      ReturnSubsoft.__set__('Logger', mockLogger)
      ReturnSubsoft.sent(true, { rawOutcome: '1234' })
    })
  })
})
