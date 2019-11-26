'use strict'

const { ServiceBroker } = require('moleculer')
const Validator = require('moleculer-json-schema-validator')

const EventDispatcherMixin = require('./event-dispatcher.mixin')

describe('Test "orders" service', () => {
  const allEventsListener = jest.fn()
  const getActionListener = jest.fn()
  const returnXActionListener = jest.fn()
  const notExistingActionListener = jest.fn()

  const MockService = {
    name: 'mock',
    mixins: [EventDispatcherMixin],
    events: {
      '**': allEventsListener,
      'mock.get': getActionListener,
      'mock.returnX': returnXActionListener,
      'notExistingActionName': notExistingActionListener,
    },
    actions: {
      get(ctx) {
        return ctx.params
      },
      returnX(ctx) {
        return 'X'
      }
    }
  }

  const broker = new ServiceBroker({ logger: false, validator: new Validator() })
  broker.createService(MockService)

  beforeAll(() => broker.start().then(() => jest.clearAllMocks()))
  afterAll(() => broker.stop())

  beforeEach(() => jest.clearAllMocks())

  it('dispatches right events after action call', () => {
    expect.assertions(4)

    return broker.call('mock.get')
      .then(() => {
        expect(allEventsListener).toBeCalledTimes(1)
        expect(getActionListener).toBeCalledTimes(1)
        expect(returnXActionListener).toBeCalledTimes(0)
        expect(notExistingActionListener).toBeCalledTimes(0)
      })
  })

  it('dispatch payload that is a response from action and depends on params', () => {
    expect.assertions(6)

    const params = { a: 1, b: 2, c: 3 }

    return broker.call('mock.get', params)
      .then(() => {
        expect(allEventsListener).toBeCalledTimes(1)
        expect(allEventsListener).toBeCalledWith(params, broker.nodeID, 'mock.get')
        expect(getActionListener).toBeCalledTimes(1)
        expect(getActionListener).toBeCalledWith(params, broker.nodeID, 'mock.get')
        expect(returnXActionListener).toBeCalledTimes(0)
        expect(notExistingActionListener).toBeCalledTimes(0)
      })
  })
  
  it('dispatch payload that is a response from action and NOT depends on params', () => {
    expect.assertions(6)

    const params = { a: 1, b: 2, c: 3 }

    return broker.call('mock.returnX', params)
      .then(() => {
        expect(allEventsListener).toBeCalledTimes(1)
        expect(allEventsListener).toBeCalledWith('X', broker.nodeID, 'mock.returnX')
        expect(returnXActionListener).toBeCalledTimes(1)
        expect(returnXActionListener).toBeCalledWith('X', broker.nodeID, 'mock.returnX')
        expect(getActionListener).toBeCalledTimes(0)
        expect(notExistingActionListener).toBeCalledTimes(0)
      })
  })

})