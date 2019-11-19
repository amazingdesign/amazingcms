'use strict'

const { ServiceBroker } = require('moleculer')
const TestService = require('../services/users.service')

describe('Test "users" service', () => {
  const broker = new ServiceBroker({ logger: false })
  broker.createService(TestService)

  beforeAll(() => broker.start())
  afterAll(() => broker.stop())

  describe('test "users.create" action', () => {
    const TEST_EMAIL = 'example-user-create@example.com'
    const TEST_PASS = '__super_UNIQUE_pass__'

    it('should return new user with at least _id and email', () => {
      return expect(
        broker.call('users.create', { email: TEST_EMAIL, password: 'secret' })
      ).resolves.toEqual(expect.objectContaining({
        _id: expect.any(String),
        email: expect.any(String)
      }))
    })

    it('called with no params, should reject an ValidationError', () => {
      return expect(broker.call('users.create')).rejects.toThrow()
    })

    it('called with no invalid email, should reject an ValidationError', () => {
      return expect(broker.call('users.create', { email: 'this-is-invalid-email' })).rejects.toThrow()
    })

    it('trying to create existing user, should reject an Error', () => {
      return expect(
        broker.call('users.create', { email: TEST_EMAIL, password: TEST_PASS })
      ).rejects.toThrowError(
        new Error('Entry with field "email" with value "example-user-create@example.com" already exists!')
      )
    })

  })

  describe('when called by api never show password, passwordSalt, and refreshTokenSalt in response', () => {
    const TEST_EMAIL = 'fields-remove@example.com'
    const TEST_PASS = '__super_UNIQUE_pass__'
    const TEST_CALL_OPTIONS = { meta: { calledByApi: true, decodedToken: { privileges: ['superadmin'] } } }
    const _CONTAINER = {}

    beforeAll(() => {
      return broker.call('users.create', { email: TEST_EMAIL, password: TEST_PASS })
        .then(response => { _CONTAINER.user = response })
    })

    it('delete fields from "get" response', () => {
      return broker.call('users.get', { id: _CONTAINER.user._id }, TEST_CALL_OPTIONS)
        .then(response => {

          expect(response).not.toEqual(expect.objectContaining({
            password: _CONTAINER.user.password,
            passwordSalt: _CONTAINER.user.passwordSalt,
            refreshTokenSalt: _CONTAINER.user.passwordSalt,
          }))
          expect(JSON.stringify(response)).not.toEqual(expect.stringContaining(_CONTAINER.user.password))
          expect(JSON.stringify(response)).not.toEqual(expect.stringContaining(_CONTAINER.user.passwordSalt))
          expect(JSON.stringify(response)).not.toEqual(expect.stringContaining(_CONTAINER.user.refreshTokenSalt))
        })
    })

    it('delete fields from "find" response', () => {
      return broker.call('users.find', { email: TEST_EMAIL }, TEST_CALL_OPTIONS)
        .then(response => {

          expect(JSON.stringify(response)).not.toEqual(expect.stringContaining(_CONTAINER.user.password))
          expect(JSON.stringify(response)).not.toEqual(expect.stringContaining(_CONTAINER.user.passwordSalt))
          expect(JSON.stringify(response)).not.toEqual(expect.stringContaining(_CONTAINER.user.refreshTokenSalt))
        })
    })

    it('delete fields from "list" response', () => {
      return broker.call('users.list', {}, TEST_CALL_OPTIONS)
        .then(response => {
          expect(JSON.stringify(response)).not.toEqual(expect.stringContaining(_CONTAINER.user.password))
          expect(JSON.stringify(response)).not.toEqual(expect.stringContaining(_CONTAINER.user.passwordSalt))
          expect(JSON.stringify(response)).not.toEqual(expect.stringContaining(_CONTAINER.user.refreshTokenSalt))
        })
    })

    it('delete fields from "update" response', () => {
      return broker.call('users.update', { id: _CONTAINER.user._id, name: 'Jane Doe' }, TEST_CALL_OPTIONS)
        .then(response => {
          expect(JSON.stringify(response)).not.toEqual(expect.stringContaining(_CONTAINER.user.password))
          expect(JSON.stringify(response)).not.toEqual(expect.stringContaining(_CONTAINER.user.passwordSalt))
          expect(JSON.stringify(response)).not.toEqual(expect.stringContaining(_CONTAINER.user.refreshTokenSalt))
        })
    })

  })

  describe('not allowed methods', () => {
    const TEST_EMAIL = 'not-allowed@example.com'
    const TEST_PASS = '__super_UNIQUE_pass__'

    it('not allows to single "insert"', () => {
      return expect(
        broker.call('users.insert', { entity: { email: TEST_EMAIL, password: TEST_PASS } })
      ).rejects.toThrow()
    })

    it('not allows to multiple "insert"', () => {
      return expect(
        broker.call('users.insert', { entities: Array(10).fill({ email: TEST_EMAIL, password: TEST_PASS }) })
      ).rejects.toThrow()
    })
  })

})