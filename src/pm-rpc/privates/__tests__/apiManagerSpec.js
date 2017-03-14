import * as apiManager from '../apiManager'
import * as messageManager from '../messageManager'
import size from 'lodash/size'
import every from 'lodash/every'
import isFunction from 'lodash/isFunction'
import Intents from '../Intents'
import noop from 'lodash/noop'
import {serialize as serializeArgs} from '../argumentsSerializer'

describe('apiManager', () => {
  describe('getDescription', () => {
    it('should return an object with the same keys and dummy values', () => {
      const API = {
        f: noop,
        g: noop
      }
      const description = apiManager.getDescription(API)
      expect(size(description)).toBe(size(API))
      expect(description.hasOwnProperty('f')).toBe(true)
      expect(description.hasOwnProperty('g')).toBe(true)
    })
  })
  describe('buildApiFromDescription', () => {
    const fakeId = 'fake-app'
    const fakeTargetInfo = {}
    it('should create an object with methods with the same keys as the description', () => {
      const description = {f: true, g: true}
      const remoteAPI = apiManager.buildApiFromDescription(fakeId, description, fakeTargetInfo)
      expect(size(remoteAPI)).toBe(size(description))
      expect(every(remoteAPI, isFunction)).toBe(true)
      expect(remoteAPI.hasOwnProperty('f')).toBe(true)
      expect(remoteAPI.hasOwnProperty('g')).toBe(true)
    })

    describe('method invocation in built API', () => {
      beforeEach(() => {
        spyOn(messageManager, 'send')
      })

      it('should resolve the promise with the value if it was sent with the RESOLVE intent', done => {
        const resolvedValue = {
          result: {},
          intent: Intents.RESOLVE
        }
        messageManager.send.and.returnValue(Promise.resolve(resolvedValue))
        const remoteAPI = apiManager.buildApiFromDescription(fakeId, {f: true}, fakeTargetInfo)
        remoteAPI.f()
          .then(result => {
            expect(result).toBe(resolvedValue.result)
          })
          .then(done)
      })


      it('should reject the promise with the value if it was sent with the REJECT intent', done => {
        const rejectedValue = {
          result: 'error message',
          intent: Intents.REJECT
        }
        messageManager.send.and.returnValue(Promise.resolve(rejectedValue))
        const remoteAPI = apiManager.buildApiFromDescription(fakeId, {f: true}, fakeTargetInfo)
        remoteAPI.f()
          .catch(result => {
            expect(result).toBe(rejectedValue.result)
          })
          .then(done)
      })
    })
  })
  describe('invokeApiFunction', () => {
    it('should return a promise for a value that is returned immediately', done => {
      const immediate = x => x
      apiManager.invokeApiFunction(immediate, serializeArgs([1]).args)
        .then(result => {
          expect(result).toBe(1)
        })
        .then(done)
    })

    it('should return a promise for the promised value from the function', done => {
      const promised = x => Promise.resolve(x)
      apiManager.invokeApiFunction(promised, serializeArgs([1]).args)
        .then(result => {
          expect(result).toBe(1)
        })
        .then(done)
    })

    it('should return a rejected promise if the function rejects the value', done =>  {
      const rejected = x => Promise.reject(x)
      apiManager.invokeApiFunction(rejected, serializeArgs([1]).args)
        .catch(result => {
          expect(result).toBe(1)
        })
        .then(done)
    })

    it('should return a rejected string if a string is thrown', done => {
      const throwString = x => {throw x}
      apiManager.invokeApiFunction(throwString, serializeArgs(['error']).args)
        .catch(result => {
          expect(result).toBe('error')
        })
        .then(done)
    })

    it('should return error info about the error if it is thrown', done => {
      const throwError = x => {throw new SyntaxError(x)}
      apiManager.invokeApiFunction(throwError, serializeArgs(['error']).args)
        .catch(result => {
          expect(result).toEqual({type: 'SyntaxError', message: 'error', stack: jasmine.any(String)})
        })
        .then(done)
    })
    it('should revert to a generic error if the Error type is not native', done => {
      class MyError extends Error {}
      const throwMyError = x => {throw new MyError(x)}
      apiManager.invokeApiFunction(throwMyError, serializeArgs(['error']).args)
        .catch(result => {
          expect(result).toEqual({type: 'Error', message: 'error', stack: jasmine.any(String)})
        })
        .then(done)
    })
  })
})