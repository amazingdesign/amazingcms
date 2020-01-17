/* eslint-disable max-lines */
'use strict'

const crypto = require('crypto')
const filterByPage = require('@bit/amazingdesign.utils.filter-by-page')

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
  // privileges
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
  // item privileges
  // and query by population values
  broker.createService({
    name: 'mustbeowner-hello-item-privileges',
    mixins: [DbService, DbUtilsMixin],
    settings: {
      requiredPrivileges: {
        count: ['mustbeowner'],
        get: ['mustbeowner'],
        find: ['mustbeowner'],
        list: ['mustbeowner'],
        create: ['mustbeowner'],
        insert: ['mustbeowner'],
        update: ['mustbeowner'],
        remove: ['mustbeowner'],
      },
      itemPrivileges: [{
        privileges: ['mustbeowner', 'some-other-permission'],
        tokenPath: '_id',
        itemPath: 'owner',
      }],
    },
  })
  broker.createService({
    name: 'mustbeowner-hello-item-privileges-and-query-by-population',
    mixins: [DbService, DbUtilsMixin],
    settings: {
      requiredPrivileges: {
        count: ['mustbeowner'],
        get: ['mustbeowner'],
        find: ['mustbeowner'],
        list: ['mustbeowner'],
        create: ['mustbeowner'],
        insert: ['mustbeowner'],
        update: ['mustbeowner'],
        remove: ['mustbeowner'],
      },
      itemPrivileges: [{
        privileges: ['mustbeowner', 'another-permission'],
        tokenPath: 'firstName',
        itemPath: 'owner.firstName',
        queryByPopulation: true,
      }],
      populates: { owner: 'owners.get' }
    },
  })
  broker.createService({
    name: 'owner-items',
    mixins: [DbService, DbUtilsMixin],
    settings: {
      populates: { owner: 'owners.get' }
    }
  })
  broker.createService({
    name: 'owners',
    mixins: [DbService, DbUtilsMixin],
  })
  const OWNERS = [
    { _id: '1', firstName: 'OwnerFirstName1', lastName: 'OwnerLastName1' },
    { _id: '2', firstName: 'OwnerFirstName2', lastName: 'OwnerLastName2' },
    { _id: '3', firstName: 'OwnerFirstName3', lastName: 'OwnerLastName3' },
    { _id: '4', firstName: 'OwnerFirstName4', lastName: 'OwnerLastName4' },
  ]
  const MUST_BE_OWNER_TEST_ITEMS = [
    { owner: '1', name: '1 - owned by 1', order: 1 },
    { owner: '1', name: '2 - owned by 1', order: 2 },
    { owner: '2', name: '3 - owned by 2', order: 3 },
    { owner: '2', name: '4 - owned by 2', order: 4 },
    { owner: '1', name: '5 - owned by 1', order: 5 },
    { owner: '3', name: '6 - owned by 3', order: 6 },
    { owner: '4', name: '7 - owned by 4', order: 7 },
    { owner: '1', name: '8 - owned by 1', order: 8 },
    { owner: '1', name: '9 - owned by 1', order: 9 },
    { owner: '1', name: '10 - owned by 1', order: 10 },
    { owner: '1', name: '11 - owned by 1', order: 11 },
    { owner: '1', name: '12 - owned by 1', order: 12 },
    { owner: '1', name: '13 - owned by 1', order: 13 },
    { owner: '1', name: '14 - owned by 1', order: 14 },
    { owner: '1', name: '15 - owned by 1', order: 15 },
    { owner: '1', name: '16 - owned by 1', order: 16 },
  ]
  const OWNER_ITEMS = MUST_BE_OWNER_TEST_ITEMS
  const makeItemsInMustBeOwnerService = () => {
    const createItem = (item) => broker.call('mustbeowner-hello-item-privileges.create', item)

    return MUST_BE_OWNER_TEST_ITEMS.reduce(
      (r, item) => r.then(() => createItem(item)),
      Promise.resolve()
    )
  }
  const makeItemsInMustBeOwnerAndQueryByPopulationService = () => {
    const createItem = (item) => broker.call('mustbeowner-hello-item-privileges-and-query-by-population.create', item)

    return MUST_BE_OWNER_TEST_ITEMS.reduce(
      (r, item) => r.then(() => createItem(item)),
      Promise.resolve()
    )
  }
  const makeItemsInOwnerItemsService = () => {
    const createItem = (item) => broker.call('owner-items.create', item)

    return OWNER_ITEMS.reduce(
      (r, item) => r.then(() => createItem(item)),
      Promise.resolve()
    )
  }
  const makeItemsInOwnersService = () => {
    const createItem = (item) => broker.call('owners.create', item)

    return OWNERS.reduce(
      (r, item) => r.then(() => createItem(item)),
      Promise.resolve()
    )
  }
  // item privileges with arrays
  broker.createService({
    name: 'item-must-have-privilege',
    mixins: [DbService, DbUtilsMixin],
    settings: {
      itemPrivileges: [{
        privileges: ['$ALL_AUTHENTICATED'],
        tokenPath: 'privileges',
        itemPath: 'privilege',
      }],
    },
  })
  broker.createService({
    name: 'item-must-have-privileges',
    mixins: [DbService, DbUtilsMixin],
    settings: {
      itemPrivileges: [{
        privileges: ['$ALL_AUTHENTICATED'],
        tokenPath: 'privileges',
        itemPath: 'privileges',
      }],
    },
  })
  const ITEMS_WITH_PRIVILEGE = [
    { _id: '1', privilege: 'first' },
    { _id: '2', privilege: 'second' },
  ]
  const ITEMS_WITH_PRIVILEGES = [
    { _id: '1', privileges: ['first'] },
    { _id: '2', privileges: ['first', 'second'] },
    { _id: '3', privileges: ['third'] },
  ]
  const makeItemsInPrivilegeService = () => {
    const createItem = (item) => broker.call('item-must-have-privilege.create', item)

    return ITEMS_WITH_PRIVILEGE.reduce(
      (r, item) => r.then(() => createItem(item)),
      Promise.resolve()
    )
  }
  const makeItemsInPrivilegesService = () => {
    const createItem = (item) => broker.call('item-must-have-privileges.create', item)

    return ITEMS_WITH_PRIVILEGES.reduce(
      (r, item) => r.then(() => createItem(item)),
      Promise.resolve()
    )
  }
  // singileton
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

  beforeAll(() => {
    return broker.start()
      .then(() => Promise.all([
        makeItemsInMustBeOwnerAndQueryByPopulationService(),
        makeItemsInMustBeOwnerService(),
        makeItemsInOwnerItemsService(),
        makeItemsInOwnersService(),
        makeItemsInPrivilegeService(),
        makeItemsInPrivilegesService(),
      ]))
  })
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
      expect.assertions(2)

      return Promise.all([
        broker.call('mock-singleton-db.insert', { entity: { name: 'Ala' } })
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
        .catch(console.log)
    })

  })

  describe('can check item privileges', () => {
    const mockCallByApiWithPayload = (action, params, payload) => {
      return broker.call(action, params, {
        meta: {
          calledByApi: true,
          decodedToken: payload,
        }
      })
    }
    const createUserPayload = (id, privileges = ['mustbeowner'], rest) => ({
      _id: id,
      privileges: privileges,
      ...rest
    })
    const filterIds = (array) => array.map((item) => ({
      ...item,
      _id: undefined
    }))

    it('starts with data to test', () => {
      expect.assertions(1)

      return broker.call('mustbeowner-hello-item-privileges.find', { sort: 'order' })
        .then((data) => {
          const dataWithoutIds = filterIds(data)

          expect(dataWithoutIds).toEqual(MUST_BE_OWNER_TEST_ITEMS)
        })
    })

    it('still fails when user do not have privileges', () => {
      expect.assertions(2)

      return mockCallByApiWithPayload(
        'mustbeowner-hello-item-privileges.find',
        { sort: 'order' },
        createUserPayload('1', [])
      )
        .catch((error) => {
          expect(error).toBeInstanceOf(PrivilegesError)
          // eslint-disable-next-line max-len
          expect(error.message).toBe('User does not have required privileges for that action! Missing privileges: mustbeowner.')
        })
    })

    it('returns only records owned by user from filter', () => {
      const USER_ID = '1'
      expect.assertions(1)

      return mockCallByApiWithPayload(
        'mustbeowner-hello-item-privileges.find',
        { sort: 'order' },
        createUserPayload(USER_ID)
      )
        .then((data) => {
          const dataWithoutIds = filterIds(data)

          expect(dataWithoutIds).toEqual(
            MUST_BE_OWNER_TEST_ITEMS.filter(item => item.owner === USER_ID)
          )
        })
    })

    it('returns only records owned by user from filter using queryByPopulation', () => {
      expect.assertions(1)

      return mockCallByApiWithPayload(
        'mustbeowner-hello-item-privileges-and-query-by-population.find',
        { sort: 'order' },
        createUserPayload('1', ['mustbeowner'], { firstName: 'OwnerFirstName1' })
      )
        .then((data) => {
          const dataWithoutIds = filterIds(data)

          expect(dataWithoutIds).toEqual(
            MUST_BE_OWNER_TEST_ITEMS
              .map((item) => ({ ...item, owner: OWNERS.find((owner) => owner._id === item.owner) }))
              .filter((item) => item.owner.firstName === 'OwnerFirstName1')
          )
        })
    })

    it('returns only records owned by user from list', () => {
      const USER_ID = '1'
      expect.assertions(1)

      return mockCallByApiWithPayload(
        'mustbeowner-hello-item-privileges.list',
        { sort: 'order', pageSize: 10 },
        createUserPayload(USER_ID)
      )
        .then((data) => {
          const dataWithoutIds = filterIds(data.rows)

          expect(dataWithoutIds).toEqual(
            MUST_BE_OWNER_TEST_ITEMS.filter(item => item.owner === USER_ID).filter((item, i) => i < 10)
          )
        })
    })

    it('returns only records owned by user from list using queryByPopulation', () => {
      expect.assertions(1)

      return mockCallByApiWithPayload(
        'mustbeowner-hello-item-privileges-and-query-by-population.list',
        { sort: 'order' },
        createUserPayload('1', ['mustbeowner'], { firstName: 'OwnerFirstName1' })
      )
        .then((data) => {
          const dataWithoutIds = filterIds(data.rows)

          expect(dataWithoutIds).toEqual(
            MUST_BE_OWNER_TEST_ITEMS
              .map((item) => ({ ...item, owner: OWNERS.find((owner) => owner._id === item.owner) }))
              .filter((item) => item.owner.firstName === 'OwnerFirstName1')
              .filter((item, i) => i < 10)
          )
        })
    })

    it('returns only records owned by user from list page 2', () => {
      const USER_ID = '1'
      expect.assertions(1)

      return mockCallByApiWithPayload(
        'mustbeowner-hello-item-privileges.list',
        { sort: 'order', pageSize: 10, page: 2 },
        createUserPayload(USER_ID)
      )
        .then((data) => {
          const dataWithoutIds = filterIds(data.rows)

          expect(dataWithoutIds).toEqual(
            MUST_BE_OWNER_TEST_ITEMS.filter(item => item.owner === USER_ID).filter((item, i) => i >= 10)
          )
        })
    })

    it('returns only records owned by user from list page 2 using queryByPopulation', () => {
      expect.assertions(1)

      return mockCallByApiWithPayload(
        'mustbeowner-hello-item-privileges-and-query-by-population.list',
        { sort: 'order', pageSize: 10, page: 2 },
        createUserPayload('1', ['mustbeowner'], { firstName: 'OwnerFirstName1' })
      )
        .then((data) => {
          const dataWithoutIds = filterIds(data.rows)

          expect(dataWithoutIds).toEqual(
            MUST_BE_OWNER_TEST_ITEMS
              .map((item) => ({ ...item, owner: OWNERS.find((owner) => owner._id === item.owner) }))
              .filter((item) => item.owner.firstName === 'OwnerFirstName1')
              .filter((item, i) => i >= 10)
          )
        })
    })

    it('returns only records owned by user from list with custom params', () => {
      const USER_ID = '1'
      expect.assertions(1)

      return mockCallByApiWithPayload(
        'mustbeowner-hello-item-privileges.list',
        { sort: 'order', pageSize: 10, query: { name: '6 - owned by 3' } },
        createUserPayload(USER_ID)
      )
        .then((data) => {
          const dataWithoutIds = filterIds(data.rows)

          expect(dataWithoutIds).toEqual([])
        })
    })

    it('returns only records owned by user from list with custom params - v2', () => {
      const USER_ID = '1'
      expect.assertions(1)

      return mockCallByApiWithPayload(
        'mustbeowner-hello-item-privileges.list',
        { sort: 'order', pageSize: 10, query: { order: { $lt: 11 } } },
        createUserPayload(USER_ID)
      )
        .then((data) => {
          const dataWithoutIds = filterIds(data.rows)

          expect(dataWithoutIds).toEqual(
            MUST_BE_OWNER_TEST_ITEMS.filter(item => item.owner === USER_ID).filter(item => item.order < 11)
          )
        })
    })

    it('returns only records owned by user from count', () => {
      const USER_ID = '1'
      expect.assertions(1)

      return mockCallByApiWithPayload(
        'mustbeowner-hello-item-privileges.count',
        {},
        createUserPayload(USER_ID)
      )
        .then((data) => expect(data).toBe(12))
    })

    it('returns only records owned by user from count using queryByPopulation', () => {
      expect.assertions(1)

      return mockCallByApiWithPayload(
        'mustbeowner-hello-item-privileges-and-query-by-population.count',
        {},
        createUserPayload('1', ['mustbeowner'], { firstName: 'OwnerFirstName1' })
      )
        .then((data) => {
          expect(data).toBe(
            MUST_BE_OWNER_TEST_ITEMS
              .map((item) => ({ ...item, owner: OWNERS.find((owner) => owner._id === item.owner) }))
              .filter((item) => item.owner.firstName === 'OwnerFirstName1')
              .length
          )
        })
    })

    it('can get own resources', () => {
      const USER_ID = '1'
      const ITEM_NAME = '1 - owned by 1'
      expect.assertions(1)

      return broker.call('mustbeowner-hello-item-privileges.find', { query: { name: ITEM_NAME } })
        .then(([item]) => item._id)
        .then((id) => {
          return mockCallByApiWithPayload(
            'mustbeowner-hello-item-privileges.get',
            { id },
            createUserPayload(USER_ID)
          )
            .then((data) => {
              const dataWithoutIds = filterIds([data])

              expect(dataWithoutIds).toEqual(
                MUST_BE_OWNER_TEST_ITEMS.filter(item => item.name === ITEM_NAME)
              )
            })
        })
    })

    it('can get own resources using queryByPopulation', () => {
      const USER_ID = '1'
      const ITEM_NAME = '1 - owned by 1'
      expect.assertions(1)

      return broker.call(
        'mustbeowner-hello-item-privileges-and-query-by-population.find',
        { query: { name: ITEM_NAME } }
      )
        .then(([item]) => {
          return mockCallByApiWithPayload(
            'mustbeowner-hello-item-privileges-and-query-by-population.get',
            { id: item._id },
            createUserPayload(USER_ID, ['mustbeowner'], { firstName: 'OwnerFirstName1' })
          )
            .then((data) => {
              expect(data).toEqual({
                ...item,
                owner: OWNERS.find((owner) => owner._id === item.owner)
              })
            })
        })
    })

    it('can update own resources', () => {
      const USER_ID = '1'
      const ITEM_NAME = '1 - owned by 1'
      expect.assertions(1)

      return broker.call('mustbeowner-hello-item-privileges.find', { query: { name: ITEM_NAME } })
        .then(([item]) => item)
        .then((item) => {
          return mockCallByApiWithPayload(
            'mustbeowner-hello-item-privileges.update',
            { id: item._id, newParam: 'Ala ma kota' },
            createUserPayload(USER_ID)
          )
            .then((data) => expect(data).toEqual({ ...item, newParam: 'Ala ma kota' }))
        })
    })

    it('can update own resources using queryByPopulation', () => {
      const USER_ID = '1'
      const ITEM_NAME = '1 - owned by 1'
      expect.assertions(1)

      return broker.call(
        'mustbeowner-hello-item-privileges-and-query-by-population.find',
        { query: { name: ITEM_NAME } }
      )
        .then(([item]) => {
          return mockCallByApiWithPayload(
            'mustbeowner-hello-item-privileges-and-query-by-population.update',
            { id: item._id, newParam: 'Ala ma kota' },
            createUserPayload(USER_ID, ['mustbeowner'], { firstName: 'OwnerFirstName1' })
          )
            .then((data) => expect(data).toEqual({ ...item, newParam: 'Ala ma kota' }))
        })
    })

    it('can remove own resources', () => {
      const USER_ID = '1'
      const ITEM_NAME = '1 - owned by 1'
      expect.assertions(1)

      return broker.call('mustbeowner-hello-item-privileges.find', { query: { name: ITEM_NAME } })
        .then(([item]) => item)
        .then((item) => {
          return mockCallByApiWithPayload(
            'mustbeowner-hello-item-privileges.remove',
            { id: item._id },
            createUserPayload(USER_ID)
          )
            .then((data) => {
              // this is response form in memory db
              // it differs from mongo, which returns removed object
              expect(data).toEqual(1)
            })
        })
    })

    it('can remove own resources using queryByPopulation', () => {
      const USER_ID = '1'
      const ITEM_NAME = '1 - owned by 1'
      expect.assertions(1)

      return broker.call(
        'mustbeowner-hello-item-privileges-and-query-by-population.find',
        { query: { name: ITEM_NAME } }
      )
        .then(([item]) => {
          return mockCallByApiWithPayload(
            'mustbeowner-hello-item-privileges-and-query-by-population.remove',
            { id: item._id, newParam: 'Ala ma kota' },
            createUserPayload(USER_ID, ['mustbeowner'], { firstName: 'OwnerFirstName1' })
          )
            .then((data) => {
              // this is response form in memory db
              // it differs from mongo, which returns removed object
              expect(data).toEqual(1)
            })
        })
    })

    it('cant get someone else resources', () => {
      const USER_ID = '1'
      const ITEM_NAME = '7 - owned by 4'
      expect.assertions(2)

      return broker.call('mustbeowner-hello-item-privileges.find', { query: { name: ITEM_NAME } })
        .then(([item]) => item._id)
        .then((id) => {
          return mockCallByApiWithPayload(
            'mustbeowner-hello-item-privileges.get',
            { id },
            createUserPayload(USER_ID)
          )
            .catch((error) => {
              expect(error).toBeInstanceOf(MoleculerError)
              // eslint-disable-next-line max-len
              expect(error.message).toBe('User cant perform that action! Fail on filter rule for mustbeowner, some-other-permission!')
            })
        })
    })

    it('cant get someone else resources using queryByPopulation', () => {
      const USER_ID = '1'
      const ITEM_NAME = '7 - owned by 4'
      expect.assertions(2)

      return broker.call(
        'mustbeowner-hello-item-privileges-and-query-by-population.find',
        { query: { name: ITEM_NAME } }
      )
        .then(([item]) => {
          return mockCallByApiWithPayload(
            'mustbeowner-hello-item-privileges-and-query-by-population.get',
            { id: item._id },
            createUserPayload(USER_ID, ['mustbeowner'], { firstName: 'OwnerFirstName1' })
          )
            .catch((error) => {
              expect(error).toBeInstanceOf(MoleculerError)
              // eslint-disable-next-line max-len
              expect(error.message).toBe('User cant perform that action! Fail on filter rule for mustbeowner, another-permission!')
            })
        })
    })

    it('cant update someone else resources', () => {
      const USER_ID = '1'
      const ITEM_NAME = '7 - owned by 4'
      expect.assertions(2)

      return broker.call('mustbeowner-hello-item-privileges.find', { query: { name: ITEM_NAME } })
        .then(([item]) => item._id)
        .then((id) => {
          return mockCallByApiWithPayload(
            'mustbeowner-hello-item-privileges.update',
            { id },
            createUserPayload(USER_ID)
          )
            .catch((error) => {
              expect(error).toBeInstanceOf(MoleculerError)
              // eslint-disable-next-line max-len
              expect(error.message).toBe('User cant perform that action! Fail on filter rule for mustbeowner, some-other-permission!')
            })
        })
    })

    it('cant update someone else resources using queryByPopulation', () => {
      const USER_ID = '1'
      const ITEM_NAME = '7 - owned by 4'
      expect.assertions(2)

      return broker.call(
        'mustbeowner-hello-item-privileges-and-query-by-population.find',
        { query: { name: ITEM_NAME } }
      )
        .then(([item]) => {
          return mockCallByApiWithPayload(
            'mustbeowner-hello-item-privileges-and-query-by-population.update',
            { id: item._id },
            createUserPayload(USER_ID, ['mustbeowner'], { firstName: 'OwnerFirstName1' })
          )
            .catch((error) => {
              expect(error).toBeInstanceOf(MoleculerError)
              // eslint-disable-next-line max-len
              expect(error.message).toBe('User cant perform that action! Fail on filter rule for mustbeowner, another-permission!')
            })
        })
    })

    it('cant remove someone else resources', () => {
      const USER_ID = '1'
      const ITEM_NAME = '7 - owned by 4'
      expect.assertions(2)

      return broker.call('mustbeowner-hello-item-privileges.find', { query: { name: ITEM_NAME } })
        .then(([item]) => item._id)
        .then((id) => {
          return mockCallByApiWithPayload(
            'mustbeowner-hello-item-privileges.remove',
            { id },
            createUserPayload(USER_ID)
          )
            .catch((error) => {
              expect(error).toBeInstanceOf(MoleculerError)
              // eslint-disable-next-line max-len
              expect(error.message).toBe('User cant perform that action! Fail on filter rule for mustbeowner, some-other-permission!')
            })
        })
    })

    it('cant remove someone else resources using queryByPopulation', () => {
      const USER_ID = '1'
      const ITEM_NAME = '7 - owned by 4'
      expect.assertions(2)

      return broker.call(
        'mustbeowner-hello-item-privileges-and-query-by-population.find',
        { query: { name: ITEM_NAME } }
      )
        .then(([item]) => {
          return mockCallByApiWithPayload(
            'mustbeowner-hello-item-privileges-and-query-by-population.remove',
            { id: item._id },
            createUserPayload(USER_ID, ['mustbeowner'], { firstName: 'OwnerFirstName1' })
          )
            .catch((error) => {
              expect(error).toBeInstanceOf(MoleculerError)
              // eslint-disable-next-line max-len
              expect(error.message).toBe('User cant perform that action! Fail on filter rule for mustbeowner, another-permission!')
            })
        })
    })

  })

  describe('can do queries (list, find, count) by population values', () => {
    const filterIds = (array) => array && array.map((item) => ({
      ...item,
      _id: undefined
    }))

    it('can simply create owners witch right ids', () => {
      expect.assertions(1)

      return broker.call('owners.find', {})
        .then((results) => expect(results).toEqual(OWNERS))
    })

    it('can simply populate items', () => {
      expect.assertions(1)

      return broker.call('owner-items.find', { populate: ['owner'], sort: 'order' })
        .then((results) => {
          const expectedResults = OWNER_ITEMS.map((item) => ({
            ...item,
            owner: OWNERS.find((owner) => owner._id === item.owner)
          }))

          expect(filterIds(results)).toEqual(expectedResults)
        })
    })

    it('can filter query by population not nested value', () => {
      expect.assertions(1)

      return broker.call(
        'owner-items.find',
        {
          populate: ['owner'], sort: 'order', queryByPopulation: true,
          query: { 'owner.firstName': 'OwnerFirstName4' }
        }
      )
        .then((results) => {
          const expectedResults = OWNER_ITEMS
            .map((item) => ({
              ...item,
              owner: OWNERS.find((owner) => owner._id === item.owner)
            }))
            .filter((item) => item.owner && item.owner.firstName === 'OwnerFirstName4')

          expect(filterIds(results)).toEqual(expectedResults)
        })
    })

    it('can still filter query by not populated value if no queryByPopulation param passed', () => {
      expect.assertions(1)

      return broker.call(
        'owner-items.find',
        {
          populate: ['owner'], sort: 'order',
          query: { owner: '4' }
        }
      )
        .then((results) => {
          const expectedResults = OWNER_ITEMS
            .map((item) => ({
              ...item,
              owner: OWNERS.find((owner) => owner._id === item.owner)
            }))
            .filter((item) => item.owner && item.owner.firstName === 'OwnerFirstName4')

          expect(filterIds(results)).toEqual(expectedResults)
        })
    })

    it('can count query by population not nested value', () => {
      expect.assertions(1)

      return broker.call(
        'owner-items.count',
        {
          populate: ['owner'], sort: 'order', queryByPopulation: true,
          query: { 'owner.firstName': 'OwnerFirstName4' }
        }
      )
        .then((result) => {
          const expectedResults = OWNER_ITEMS
            .map((item) => ({
              ...item,
              owner: OWNERS.find((owner) => owner._id === item.owner)
            }))
            .filter((item) => item.owner && item.owner.firstName === 'OwnerFirstName4')
            .length

          expect(result).toBe(expectedResults)
        })
    })

    it('can still count query by not populated value if no queryByPopulation param passed', () => {
      expect.assertions(1)

      return broker.call(
        'owner-items.count',
        {
          populate: ['owner'], sort: 'order',
          query: { owner: '4' }
        }
      )
        .then((result) => {
          const expectedResults = OWNER_ITEMS
            .map((item) => ({
              ...item,
              owner: OWNERS.find((owner) => owner._id === item.owner)
            }))
            .filter((item) => item.owner && item.owner.firstName === 'OwnerFirstName4')
            .length

          expect(result).toEqual(expectedResults)
        })
    })

    it('can list query by population not nested value', () => {
      expect.assertions(1)

      return broker.call(
        'owner-items.list',
        {
          populate: ['owner'], sort: 'order', queryByPopulation: true,
          query: { 'owner.firstName': 'OwnerFirstName4' }
        }
      )
        .then((result) => {
          const resultRows = result.rows
          const expectedAllItems = OWNER_ITEMS
            .map((item) => ({
              ...item,
              owner: OWNERS.find((owner) => owner._id === item.owner)
            }))
            .filter((item) => item.owner && item.owner.firstName === 'OwnerFirstName4')
          const expectedCount = expectedAllItems.length
          const expectedRows = expectedAllItems.filter(filterByPage(1, 10))

          expect({ ...result, rows: filterIds(resultRows) }).toEqual({
            page: 1,
            pageSize: 10,
            totalPages: Math.floor((expectedCount + 10 - 1) / 10),
            total: expectedCount,
            rows: expectedRows,
          })
        })
    })

    it('can list query by population not nested value v2', () => {
      expect.assertions(1)

      return broker.call(
        'owner-items.list',
        {
          populate: ['owner'], sort: 'order', queryByPopulation: true,
          query: { 'owner.firstName': 'OwnerFirstName1' }
        }
      )
        .then((result) => {
          const resultRows = result.rows
          const expectedAllItems = OWNER_ITEMS
            .map((item) => ({
              ...item,
              owner: OWNERS.find((owner) => owner._id === item.owner)
            }))
            .filter((item) => item.owner && item.owner.firstName === 'OwnerFirstName1')
          const expectedCount = expectedAllItems.length
          const expectedRows = expectedAllItems.filter(filterByPage(1, 10))

          expect({ ...result, rows: filterIds(resultRows) }).toEqual({
            page: 1,
            pageSize: 10,
            totalPages: Math.floor((expectedCount + 10 - 1) / 10),
            total: expectedCount,
            rows: expectedRows,
          })
        })
    })

    it('can list query by population not nested value v3', () => {
      expect.assertions(1)

      const page = 3
      const pageSize = 5

      return broker.call(
        'owner-items.list',
        {
          page, pageSize,
          populate: ['owner'], sort: 'order', queryByPopulation: true,
          query: { 'owner.firstName': 'OwnerFirstName1' }
        }
      )
        .then((result) => {
          const resultRows = result.rows
          const expectedAllItems = OWNER_ITEMS
            .map((item) => ({
              ...item,
              owner: OWNERS.find((owner) => owner._id === item.owner)
            }))
            .filter((item) => item.owner && item.owner.firstName === 'OwnerFirstName1')
          const expectedCount = expectedAllItems.length
          const expectedRows = expectedAllItems.filter(filterByPage(page, pageSize))

          expect({ ...result, rows: filterIds(resultRows) }).toEqual({
            page,
            pageSize,
            totalPages: Math.floor((expectedCount + pageSize - 1) / pageSize),
            total: expectedCount,
            rows: expectedRows,
          })
        })
    })

  })

  describe('can check item privileges with arrays', () => {

    const mockCallByApiWithPayload = (action, params, payload) => {
      return broker.call(action, params, {
        meta: {
          calledByApi: true,
          decodedToken: payload,
        }
      })
    }
    const createUserPayload = (privileges, rest) => ({
      _id: 'xxx-xxx-xxx',
      privileges: privileges,
      ...rest
    })

    it('can find all items that matched privilege from token (user have 1 valid privilege)', () => {
      expect.assertions(1)
      
      const payload = createUserPayload(['first'])

      return mockCallByApiWithPayload('item-must-have-privilege.find', {}, payload)
        .then((data) => {
          expect(data).toEqual(ITEMS_WITH_PRIVILEGE.filter((item) => item.privilege === 'first'))
        })
    })

    it('can find all items that matched privilege from token (user have 1 valid and 1 invalid privilege)', () => {
      expect.assertions(1)
      
      const payload = createUserPayload(['first', 'other'])

      return mockCallByApiWithPayload('item-must-have-privilege.find', {}, payload)
        .then((data) => {
          expect(data).toEqual(ITEMS_WITH_PRIVILEGE.filter((item) => item.privilege === 'first'))
        })
    })

    it('can find all items that matched privilege from token (user have 2 valid privileges)', () => {
      expect.assertions(1)
      
      const payload = createUserPayload(['first', 'second'])

      return mockCallByApiWithPayload('item-must-have-privilege.find', {}, payload)
        .then((data) => {
          expect(data).toEqual(ITEMS_WITH_PRIVILEGE)
        })
    })

    it('can find all items that matched privilege from token (array vs one privilege in token)', () => {
      expect.assertions(1)
      
      const payload = createUserPayload(['first'])

      return mockCallByApiWithPayload('item-must-have-privileges.find', {}, payload)
        .then((data) => {
          expect(data).toEqual(ITEMS_WITH_PRIVILEGES.filter((item) => item.privileges.includes('first')))
        })
    })

    // eslint-disable-next-line max-len
    it('can find all items that matched privilege from token (array vs 2 privileges in token 1 valid 1 invalid)', () => {
      expect.assertions(1)
      
      const payload = createUserPayload(['first', 'other'])

      return mockCallByApiWithPayload('item-must-have-privileges.find', {}, payload)
        .then((data) => {
          expect(data).toEqual(ITEMS_WITH_PRIVILEGES.filter((item) => item.privileges.includes('first')))
        })
    })

    it('can find all items that matched privilege from token (array vs 2 privileges in token both valid)', () => {
      expect.assertions(1)
      
      const payload = createUserPayload(['first', 'second'])

      return mockCallByApiWithPayload('item-must-have-privileges.find', {}, payload)
        .then((data) => {
          expect(data).toEqual(
            ITEMS_WITH_PRIVILEGES.filter(
              (item) => item.privileges.find((privilege) => ['first', 'second'].includes(privilege))
            )
          )
        })
    })

    it('can find all items that matched privilege from token (array vs 3 privileges in token all valid)', () => {
      expect.assertions(1)
      
      const payload = createUserPayload(['first', 'second', 'third'])

      return mockCallByApiWithPayload('item-must-have-privileges.find', {}, payload)
        .then((data) => {
          expect(data).toEqual(
            ITEMS_WITH_PRIVILEGES.filter(
              (item) => item.privileges.find((privilege) => ['first', 'second', 'third'].includes(privilege))
            )
          )
        })
    })

  })

})