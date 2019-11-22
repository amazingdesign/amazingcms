'use strict'

const { ServiceBroker } = require('moleculer')
const Validator = require('moleculer-json-schema-validator')

const LanguagesService = require('../services/languages.service')

describe('Test "languages" service', () => {
  const TEST_NAME = 'Polski'
  const TEST_CODE = 'pl'

  const broker = new ServiceBroker({ logger: false, validator: new Validator() })
  broker.createService(LanguagesService)

  beforeAll(() => broker.start())
  afterAll(() => broker.stop())

  it('should return new language with at least _id, name and code', () => {
    return expect(
      broker.call('languages.create', { name: TEST_NAME, code: TEST_CODE })
    ).resolves.toEqual(expect.objectContaining({
      _id: expect.any(String),
      name: expect.any(String),
      code: expect.any(String),
    }))
  })

  it('called with no params, should reject an ValidationError', () => {
    return expect(broker.call('languages.create')).rejects.toThrow()
  })

  it('trying to create existing language code, should reject an Error', () => {
    return expect(
      broker.call('languages.create', { name: TEST_NAME, code: TEST_CODE })
    ).rejects.toThrowError(new Error('Entry with field "code" with value "pl" already exists!'))
  })
})