const { ServiceBroker } = require('moleculer')
const Validator = require('moleculer-json-schema-validator')

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

    const broker = new ServiceBroker({ logger: false, validator: new Validator() })
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
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              }
            },
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
          // @FIXME @HACK have to pass archived query because tests rely on nedb
          // ant it have unresolved issue with query operators like $ne
          // which is used when no archived query is passed
          // https://github.com/louischatriot/nedb/issues?utf8=%E2%9C%93&q=Field+names+cannot+begin+with+the+%24+character
          broker.call('actions.list', { TEST_PARAMS, query: { _archived: false } }, makeCallOptions(testServiceName))
            .catch(console.log)
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

    const broker = new ServiceBroker({ logger: false, validator: new Validator() })
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
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          }
        }
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