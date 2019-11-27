/* eslint-disable max-lines */
'use strict'

const crypto = require('crypto')

const DbService = require('moleculer-db')
const { ServiceBroker } = require('moleculer')
const { MoleculerError } = require('moleculer').Errors
const { Errors: WebErrors } = require('moleculer-web')

const { PrivilegesError } = require('./db-utils.errors')
const DbUtilsMixin = require('./db-utils.mixin')

const TEST_EMAIL = 'example@example.com'
const TEST_PASS = '__super_UNIQUE_pass__'

describe('Test "db-utils" mixin', () => {
  const _CONTAINER = {}
  const mockCallByApi = (action, params, privilegesFromToken, systemPrivileges) => {
    return broker.call(action, params, {
      meta: { calledByApi: true, decodedToken: { privileges: privilegesFromToken }, privileges: systemPrivileges }
    })
  }

  const broker = new ServiceBroker({ logger: false })
  broker.createService({
    name: 'mockdb',

    mixins: [
      DbService,
      DbUtilsMixin
    ],

    settings: {
      fields: ['_id', 'email', 'password'],
      entityValidator: {
        email: 'email',
        password: { type: 'string', min: 6, max: 255 },
      }
    },

    hooks: {
      after: {
        '*': function (...all) {
          return this.removeFieldFromResponses('password')(...all)
        }
      }
    },
  })

  const makePrivilegesService = (rest) => ({
    mixins: [DbUtilsMixin],
    actions: { hello() { return 'OK' }, other() { return 'ALSO OK' } },
    ...rest
  })
  broker.createService(makePrivilegesService({
    name: 'no-privileges',
    settings: {},
  }))
  broker.createService(makePrivilegesService({
    name: 'empty-hello-privileges',
    settings: { requiredPrivileges: { hello: [] } },
  }))
  broker.createService(makePrivilegesService({
    name: 'object-hello-privileges',
    settings: { requiredPrivileges: { hello: {} } }, // invalid
  }))
  broker.createService(makePrivilegesService({
    name: 'admin-hello-privileges',
    settings: { requiredPrivileges: { hello: ['admin'] } },
  }))
  broker.createService(makePrivilegesService({
    name: 'all-authenticated-hello-privileges',
    settings: { requiredPrivileges: { hello: ['$ALL_AUTHENTICATED'] } },
  }))
  broker.createService(makePrivilegesService({
    name: 'system-hello-privileges',
    settings: { requiredPrivileges: { hello: ['$SYSTEM'] } },
  }))
  broker.createService(makePrivilegesService({
    name: 'events-hello-privileges',
    settings: { requiredPrivileges: { hello: ['$EVENTS'] } },
  }))
  broker.createService(makePrivilegesService({
    name: 'events-action-name-hello-privileges',
    settings: { requiredPrivileges: { hello: ['$EVENTS-action.name'] } },
  }))

  broker.createService({
    name: 'mock-singleton-db',

    mixins: [
      DbService,
      DbUtilsMixin
    ],

    settings: {
      singleton: true,
      fields: ['_id', 'name'],
      entityValidator: {
        name: 'string',
      }
    },
  })


  beforeAll(() => broker.start())
  afterAll(() => broker.stop())

  describe('removes field from responses', () => {

    it('delete field from "create" response', () => {
      return broker.call('mockdb.create', { email: TEST_EMAIL, password: TEST_PASS })
        .then(response => {
          _CONTAINER.user = response

          expect(response).not.toEqual(expect.objectContaining({ password: TEST_PASS }))
          expect(JSON.stringify(response)).not.toMatch(new RegExp(TEST_PASS, 'g'))
          expect(response.password).toBe(undefined)
        })
    })

    it('delete field from "get" response', () => {
      return broker.call('mockdb.get', { id: _CONTAINER.user._id })
        .then(response => {

          expect(response).not.toEqual(expect.objectContaining({ password: TEST_PASS }))
          expect(JSON.stringify(response)).not.toMatch(new RegExp(TEST_PASS, 'g'))
          expect(response.password).toBe(undefined)
        })
    })

    it('delete field from "find" response', () => {
      return broker.call('mockdb.find', { email: TEST_EMAIL })
        .then(response => {

          expect(JSON.stringify(response)).not.toMatch(new RegExp(TEST_PASS, 'g'))
          expect(response.password).toBe(undefined)
        })
    })

    it('delete field from "list" response', () => {
      return broker.call('mockdb.list')
        .then(response => {
          expect(JSON.stringify(response)).not.toMatch(new RegExp(TEST_PASS, 'g'))
          expect(response.password).toBe(undefined)
        })
    })

    it('delete field from "update" response', () => {
      return broker.call('mockdb.update', { id: _CONTAINER.user._id, name: 'Jane Doe' })
        .then(response => {
          expect(JSON.stringify(response)).not.toMatch(new RegExp(TEST_PASS, 'g'))
          expect(response.password).toBe(undefined)
        })
    })

    it('delete field from single entity "insert" response', () => {
      return broker.call('mockdb.insert', { entity: { email: TEST_EMAIL, password: TEST_PASS } })
        .then(response => {
          expect(JSON.stringify(response)).not.toMatch(new RegExp(TEST_PASS, 'g'))
          expect(response.password).toBe(undefined)
        })
    })

    it('delete field from multiple entities "insert" response', () => {
      return broker.call('mockdb.insert', { entities: Array(10).fill({ email: TEST_EMAIL, password: TEST_PASS }) })
        .then(response => {
          expect(JSON.stringify(response)).not.toMatch(new RegExp(TEST_PASS, 'g'))
          expect(response.password).toBe(undefined)
        })
    })

    it('delete field "remove" response', () => {
      return broker.call('mockdb.remove', { id: _CONTAINER.user._id })
        .then(response => {
          expect(response).not.toEqual(expect.objectContaining({ password: TEST_PASS }))
          expect(JSON.stringify(response)).not.toMatch(new RegExp(TEST_PASS, 'g'))
          expect(response.password).toBe(undefined)
        })
    })

  })

  describe('hashes', () => {

    it('hashes with salt', () => {
      const getKey = (pass, salt) => crypto.pbkdf2Sync(pass, salt, 100, 512, 'sha512').toString('hex')
      const ctx = { params: { password: TEST_PASS } }

      const { params: result } = DbUtilsMixin.methods.hashFieldWithSalt('password')(ctx)

      expect(ctx).toEqual({
        params: {
          password: getKey(TEST_PASS, result.passwordSalt),
          passwordSalt: result.passwordSalt,
        }
      })
    })

  })

  describe('can check privileges', () => {
    it('do not throw when no requiredPrivileges specified in settings', () => {
      expect.assertions(1)

      return mockCallByApi('no-privileges.hello')
        .then((data) => expect(data).toBe('OK'))
    })

    it('do not throw when no requiredPrivileges for called action are specified', () => {
      expect.assertions(1)

      return mockCallByApi('admin-hello-privileges.other')
        .then((data) => expect(data).toBe('ALSO OK'))
    })

    it('throw when requiredPrivileges for called action are invalid', () => {
      expect.assertions(2)

      return mockCallByApi('object-hello-privileges.hello')
        .catch((error) => {
          expect(error).toBeInstanceOf(MoleculerError)
          // eslint-disable-next-line max-len
          expect(error.message).toBe('Privileges to check (from service settings) should be an array!Found object instead.')
        })
    })
    it('skip when not calledByApi even requiredPrivileges for called action are invalid', () => {
      expect.assertions(1)

      return broker.call('object-hello-privileges.hello')
        .then((data) => expect(data).toBe('OK'))
    })

    it('throw when user does not have privileges but there are privileges specified', () => {
      expect.assertions(2)

      return mockCallByApi('admin-hello-privileges.hello', {}, undefined)
        .catch((error) => {
          expect(error).toBeInstanceOf(PrivilegesError)
          // eslint-disable-next-line max-len
          expect(error.message).toBe('User does not have required privileges for that action! Missing privileges: admin.')
        })
    })

    it('throw when user has invalid privileges (object instead of array)', () => {
      expect.assertions(2)

      return mockCallByApi('admin-hello-privileges.hello', {}, {})
        .catch((error) => {
          expect(error).toBeInstanceOf(MoleculerError)
          expect(error.message).toBe('Privileges in token should be an array! Found object instead.')
        })
    })

    it('throw when user does not have valid privileges', () => {
      expect.assertions(2)

      return mockCallByApi('admin-hello-privileges.hello', {}, [])
        .catch((error) => {
          expect(error).toBeInstanceOf(PrivilegesError)
          // eslint-disable-next-line max-len
          expect(error.message).toBe('User does not have required privileges for that action! Missing privileges: admin.')
        })
    })

    it('throw when user does not have valid privileges v2', () => {
      expect.assertions(2)

      return mockCallByApi('admin-hello-privileges.hello', {}, ['not-admin'])
        .catch((error) => {
          expect(error).toBeInstanceOf(PrivilegesError)
          // eslint-disable-next-line max-len
          expect(error.message).toBe('User does not have required privileges for that action! Missing privileges: admin.')
        })
    })

    it('passes when user has valid privileges', () => {
      expect.assertions(1)

      return mockCallByApi('admin-hello-privileges.hello', {}, ['admin'])
        .then((data) => expect(data).toBe('OK'))
    })

    it('passes on $ALL_AUTHENTICATED privileges', () => {
      expect.assertions(1)

      return mockCallByApi('all-authenticated-hello-privileges.hello', {})
        .then((data) => expect(data).toBe('OK'))
    })

    it('passes on $SYSTEM privileges', () => {
      expect.assertions(1)

      return mockCallByApi('system-hello-privileges.hello', {}, undefined, ['$SYSTEM'])
        .then((data) => expect(data).toBe('OK'))
    })

    it('passes on $EVENTS privileges', () => {
      expect.assertions(1)

      return mockCallByApi('events-hello-privileges.hello', {}, undefined, ['$EVENTS'])
        .then((data) => expect(data).toBe('OK'))
    })

    it('passes on $EVENTS-action.name privileges', () => {
      expect.assertions(1)

      return mockCallByApi('events-action-name-hello-privileges.hello', {}, undefined, ['$EVENTS-action.name'])
        .then((data) => expect(data).toBe('OK'))
    })

    it('throws on $EVENTS when more specified $EVENTS-action.name required', () => {
      expect.assertions(2)

      return mockCallByApi('events-action-name-hello-privileges.hello', {}, undefined, ['$EVENTS'])
        .catch((error) => {
          expect(error).toBeInstanceOf(PrivilegesError)
          // eslint-disable-next-line max-len
          expect(error.message).toBe('User does not have required privileges for that action! Missing privileges: $EVENTS-action.name.')
        })
    })

  })

  describe('can make service singleton', () => {

    it('throws on unsupported methods on internal calls', () => {
      expect.assertions(3)

      return Promise.all([
        broker.call('mock-singleton-db.insert', { entity: { name: 'Ala' } })
          .catch(error => expect(error).toBeInstanceOf(WebErrors.BadRequestError)),
        broker.call('mock-singleton-db.get', { id: 'XXX' })
          .catch(error => expect(error).toBeInstanceOf(WebErrors.BadRequestError)),
        broker.call('mock-singleton-db.remove', { id: 'XXX' })
          .catch(error => expect(error).toBeInstanceOf(WebErrors.BadRequestError)),
      ])
    })

    it('throws on unsupported methods on api calls', () => {
      expect.assertions(4)

      return Promise.all([
        mockCallByApi('mock-singleton-db.insert', { entity: { name: 'Ala' } })
          .catch(error => expect(error).toBeInstanceOf(WebErrors.BadRequestError)),
        mockCallByApi('mock-singleton-db.get', { id: 'XXX' })
          .catch(error => expect(error).toBeInstanceOf(WebErrors.BadRequestError)),
        mockCallByApi('mock-singleton-db.update', { id: 'XXX' })
          .catch(error => expect(error).toBeInstanceOf(WebErrors.BadRequestError)),
        mockCallByApi('mock-singleton-db.remove', { id: 'XXX' })
          .catch(error => expect(error).toBeInstanceOf(WebErrors.BadRequestError)),
      ])
    })

    it('creates one, then overwrite', () => {
      expect.assertions(3)

      return broker.call('mock-singleton-db.count')
        .then(count => expect(count).toBe(0))
        .then(() => broker.call('mock-singleton-db.create', { name: 'Ala' }))
        .then(() => broker.call('mock-singleton-db.create', { name: 'Ela' }))
        .then(() => broker.call('mock-singleton-db.create', { name: 'Ola' }))
        .then(() => broker.call('mock-singleton-db.count'))
        .then(count => expect(count).toBe(1))
        .then(() => broker.call('mock-singleton-db.find'))
        .then(data => expect(data[0]).toEqual({ _id: expect.any(String), name: 'Ola' }))
    })

  })
})