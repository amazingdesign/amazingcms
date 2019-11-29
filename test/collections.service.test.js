'use strict'

const { ServiceBroker } = require('moleculer')
const Validator = require('moleculer-json-schema-validator')

const CollectionsService = require('../services/collections.service')

describe('Test "collections" service', () => {
  const TEST_NAME = 'test'
  const SECOND_TEST_NAME = 'test2'
  const TEST_FIELDS = [{
    name: 'name',
    label: 'Name',
  }]
  const TEST_SCHEMA = {
    type: 'object',
    properties: { name: { type: 'string' } }
  }
  const TEST_SCHEMA_WITH_OPTIONS = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      privileges: {
        type: 'array',
        items: {
          type: 'string'
        },
        options: {
          serviceName: 'options'
        }
      },
    }
  }

  const broker = new ServiceBroker({ logger: false, validator: new Validator() })
  broker.createService(CollectionsService)
  broker.createService({
    name: 'options',
    actions: {
      find: () => Promise.resolve([
        { _id: 'xxx', name: 'Option 1' },
        { _id: 'yyy', name: 'Option 2' },
        { _id: 'zzz', name: 'Option 3' },
      ])
    }
  })

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

  it('should fill schema with options', () => {
    let newCollectionId = null

    return broker.call(
      'collections.create',
      { name: SECOND_TEST_NAME, tableFields: TEST_FIELDS, schema: TEST_SCHEMA_WITH_OPTIONS }
    )
      .then(({ _id }) => {
        newCollectionId = _id
        return broker.call('collections.get', { id: newCollectionId })
      })
      .then(response => {
        expect(response).toEqual({
          _id: newCollectionId,
          name: SECOND_TEST_NAME,
          tableFields: TEST_FIELDS,
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              privileges: {
                type: 'array',
                items: {
                  type: 'string'
                },
                options: [
                  { value: 'xxx', label: 'Option 1' },
                  { value: 'yyy', label: 'Option 2' },
                  { value: 'zzz', label: 'Option 3' },
                ]
              },
            }
          },
          createdAt: expect.any(Object),
          updatedAt: expect.any(Object),
        })
      })
  })
})