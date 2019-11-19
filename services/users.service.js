'use strict'

const DbService = require('../db/main')
const DbUtilsMixin = require('@bit/amazingdesign.moleculer.db-utilsmixin')
const generateSalt = require('@bit/amazingdesign.utils.generate-salt')

module.exports = {
  name: 'users',

  collection: 'users',

  mixins: [
    DbService,
    DbUtilsMixin,
  ],

  hooks: {
    before: {
      'create': [
        'hashPassword',
        'throwWhenUserExists',
        'addRefreshTokenSalt'
      ],
      'update': [
        'hashPassword',
      ],
      'insert': () => { return Promise.reject(new Error('Method not allowed!')) }
    },
    after: {
      '*': 'removeSecretFieldsFromResponseIfCalledByApi',
    }
  },

  settings: {
    requiredPrivileges: {
      count: ['superadmin'],
      list: ['superadmin'],
      create: ['superadmin'],
      insert: ['superadmin'],
      get: ['superadmin'],
      update: ['superadmin'],
      remove: ['superadmin'],
    },
    fields: ['_id', 'email', 'password', 'passwordSalt', 'refreshTokenSalt', 'firstName', 'lastName', 'privileges'],
    entityValidator: {
      email: 'email',
      password: { type: 'string', min: 1024, max: 1024 },
      passwordSalt: { type: 'string', min: 32, max: 32 },
      refreshTokenSalt: { type: 'string', min: 32, max: 32 },
      firstName: { type: 'string', optional: true },
      lastName: { type: 'string', optional: true },
      privileges: { type: 'array', items: 'string', optional: true }
    }
  },

  methods: {
    throwWhenUserExists(ctx) {
      return this.throwWhenFieldExists('email')(ctx)
    },
    hashPassword(ctx) {
      return ctx.params.password ?
        this.hashFieldWithSalt('password')(ctx)
        :
        ctx
    },
    addRefreshTokenSalt(ctx) {
      ctx.params = {
        ...ctx.params,
        refreshTokenSalt: generateSalt()
      }

      return ctx
    },
    removeSecretFieldsFromResponseIfCalledByApi(ctx, res) {
      if (ctx.meta && !ctx.meta.calledByApi) return res

      const resAfterPassRemove = this.removeFieldFromResponses('password')(ctx, res)
      const resAfterPassSaltRemove = this.removeFieldFromResponses('passwordSalt')(ctx, resAfterPassRemove)
      return this.removeFieldFromResponses('refreshTokenSalt')(ctx, resAfterPassSaltRemove)
    }
  },

}