'use strict'

const { ServiceBroker } = require('moleculer')
const Validator = require('moleculer-json-schema-validator')

const CollectionsService = require('../services/collections.service')

describe('Test "collections" service', () => {
  const TEST_NAME = 'test'
  const TEST_FIELDS = [{
    name: 'name',
    label: 'Name',
  }]
  const TEST_SCHEMA = { type: 'object', properties: { name: { type: 'string' } } }

  const broker = new ServiceBroker({ logger: false, validator: new Validator() })
  broker.createService(CollectionsService)

  beforeAll(() => broker.start())
  afterAll(() => broker.stop())

  it('should return new collection with at least _id, name, tableFields and validator', () => {
    return expect(
      broker.call('collections.create', { name: TEST_NAME, tableFields: TEST_FIELDS, schema: TEST_SCHEMA })
    ).resolves.toEqual(expect.objectContaining({
      _id: expect.any(String),
      name: expect.any(String),
      tableFields: expect.any(Array),
      schema: expect.any(Object),
    }))
  })

  it('called with no params, should reject an ValidationError', () => {
    return expect(broker.call('collections.create')).rejects.toThrow()
  })

  it('trying to create existing collection name, should reject an Error', () => {
    return expect(
      broker.call('collections.create', { name: TEST_NAME, tableFields: TEST_FIELDS, validator: TEST_SCHEMA })
    ).rejects.toThrowError(new Error('Entry with field "name" with value "test" already exists!'))
  })
})