const { ServiceBroker } = require('moleculer')
const { MoleculerError } = require('moleculer').Errors
const Validator = require('moleculer-json-schema-validator')

const CollectionsService = require('../services/collections.service')
const CollectionsLoaderService = require('../services/collections-loader.service')
const ActionsService = require('../services/actions.service')
const LanguagesService = require('../services/languages.service')

describe('Test "actions" service', () => {
  const TEST_PARAMS = { name: 'test-name', id: 'abc' }
  const TEST_CALL_OPTIONS = { meta: { calledByApi: true } }
  const TEST_ACTIONS_NAMES = ['list', 'get', 'create', 'update', 'remove']

  const makeCallOptions = (collectionName) => {
    TEST_CALL_OPTIONS.meta.collectionName = collectionName
    return TEST_CALL_OPTIONS
  }
  const makeMockAction = (collectionName) => (
    (ctx) => `${collectionName} was called ${JSON.stringify(ctx.params)}`
  )

  const broker = new ServiceBroker({ logger: false, validator: new Validator() })
  broker.createService(ActionsService)
  broker.createService(CollectionsService)
  broker.createService(CollectionsLoaderService)
  broker.createService(LanguagesService)
  broker.createService({
    name: 'mock-service__pl',
    actions: TEST_ACTIONS_NAMES.reduce(
      (r, collectionName) => ({
        ...r,
        [collectionName]: makeMockAction(collectionName)
      }),
      {}
    )
  })

  beforeAll(() => {
    return broker.start()
      .then(() => broker.call('languages.create', { name: 'Polski', code: 'pl' }))
      .then(() => broker.call('collections.create', {
        name: 'dynamically-created-service',
        fields: [ {
          fieldType: 'text-field',
          name: 'name'
        } ],
        validator: { name: 'string' }
      }))
  })
  afterAll(() => broker.stop())

  describe('forwarding', () => {

    it('forward REST actions', () => {
      const promises = TEST_ACTIONS_NAMES.map(
        testActionName => (
          expect(
            broker.call(`actions.${testActionName}`, TEST_PARAMS, makeCallOptions('mock-service'))
          ).resolves.toBe(`${testActionName} was called ${JSON.stringify(TEST_PARAMS)}`)
        )
      )

      return Promise.all(promises)
    })

  })

  describe('creating service', () => {

    it('create service if one is not available but exists in collections', () => {
      expect.assertions(5)

      return Promise.all([
        broker.call('actions.list', TEST_PARAMS, makeCallOptions('dynamically-created-service'))
          .then((value) => expect(value).toEqual(expect.anything()))
        ,
        broker.call('actions.create', TEST_PARAMS, makeCallOptions('dynamically-created-service'))
          .then((value) => expect(value).toEqual(expect.anything()))
        ,
        broker.call('actions.get', TEST_PARAMS, makeCallOptions('dynamically-created-service'))
          .catch((error) => expect(error.message).toBe('Entity not found'))
        ,
        broker.call('actions.update', TEST_PARAMS, makeCallOptions('dynamically-created-service'))
          .catch((error) => expect(error.message).toBe('Entity not found'))
        ,
        broker.call('actions.remove', TEST_PARAMS, makeCallOptions('dynamically-created-service'))
          .catch((error) => expect(error.message).toBe('Entity not found'))
      ])
    })

    it('throws if service not exists in collections', () => {
      expect.assertions(5)

      const promises = TEST_ACTIONS_NAMES.map(
        testActionName => (
          expect(
            broker.call(`actions.${testActionName}`, TEST_PARAMS, makeCallOptions('service-that-is-not-in-collections'))
          ).rejects.toBeInstanceOf(MoleculerError)
        )
      )

      return Promise.all(promises)
    })

  })
})