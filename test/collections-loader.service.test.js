const { ServiceBroker } = require('moleculer')

const CollectionsLoaderService = require('../services/collections-loader.service')
const ActionsService = require('../services/actions.service')
const CollectionsService = require('../services/collections.service')

describe('Test "collection-loader" service', () => {

  describe('creating existing collections on startup', () => {

    const TEST_CALL_OPTIONS = { meta: { calledByApi: true } }
    const TEST_PARAMS = { a: 1, b: 2, id: 'abc' }

    const TEST_SERVICES_NAMES = [
      'dynamically-created-service-1',
      'dynamically-created-service-2',
      'dynamically-created-service-3'
    ]
    const makeCallOptions = (collectionName) => {
      TEST_CALL_OPTIONS.meta.collectionName = collectionName
      return TEST_CALL_OPTIONS
    }

    const broker = new ServiceBroker({ logger: false })
    broker.createService(ActionsService)
    broker.createService(CollectionsLoaderService)
    broker.createService({
      name: 'languages',
      actions: {
        find() {
          return Promise.resolve([
            { name: 'Polski', code: 'pl' }
          ])
        }
      }
    })
    broker.createService({
      name: 'collections',
      actions: {
        find() {
          return Promise.resolve(TEST_SERVICES_NAMES.map(name => ({
            name,
            fields: [{
              fieldType: 'text-field',
              name: 'name'
            }],
          })))
        }
      }
    })
    beforeAll(() => {
      return broker.start()
        .then(() => broker.waitForServices(TEST_SERVICES_NAMES.map(name => name + '__pl')))
    })
    afterAll(() => broker.stop())

    TEST_SERVICES_NAMES.forEach((testServiceName) =>
      it(`created ${testServiceName} collection can be called`, () => {
        expect.assertions(5)

        return Promise.all([
          broker.call('actions.list', TEST_PARAMS, makeCallOptions(testServiceName))
            .then((value) => expect(value).toEqual(expect.anything()))
          ,
          broker.call('actions.create', TEST_PARAMS, makeCallOptions(testServiceName))
            .then((value) => expect(value).toEqual(expect.anything()))
          ,
          broker.call('actions.get', TEST_PARAMS, makeCallOptions(testServiceName))
            .catch((error) => expect(error.message).toBe('Entity not found'))
          ,
          broker.call('actions.update', TEST_PARAMS, makeCallOptions(testServiceName))
            .catch((error) => expect(error.message).toBe('Entity not found'))
          ,
          broker.call('actions.remove', TEST_PARAMS, makeCallOptions(testServiceName))
            .catch((error) => expect(error.message).toBe('Entity not found'))
        ])
      })
    )

  })

  describe('creating new collections as services', () => {

    const broker = new ServiceBroker({ logger: false })
    broker.createService(CollectionsLoaderService)
    broker.createService(CollectionsService)
    broker.createService({
      name: 'languages',
      actions: {
        find() {
          return Promise.resolve([
            { name: 'Polski', code: 'pl' }
          ])
        }
      }
    })

    beforeAll(() => broker.start())
    afterAll(() => broker.stop())

    it('can call new collection after create', () => {
      expect.assertions(2)

      return broker.call('collections.create', {
        name: 'createdcollection',
        fields: [{
          fieldType: 'text-field',
          name: 'name'
        }],
        validator: { name: 'string' }
      })
        .then(() => broker.call('collections-loader.loadCollectionAsService', { collectionName: 'createdcollection' }))
        .then(() => broker.call('createdcollection__pl.find')
          .then(findResult => {
            expect(findResult).toBeInstanceOf(Array)
            expect(findResult.length).toBe(0)
          })
        )

    })

  })

})