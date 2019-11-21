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
      getSchema: ['superadmin'],
    },
    fields: ['_id', 'email', 'password', 'passwordSalt', 'refreshTokenSalt', 'firstName', 'lastName', 'privileges'],
    entityValidator: {
      type: 'object',
      required: ['email', 'password', 'passwordSalt', 'refreshTokenSalt'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 1024, maxLength: 1024 },
        passwordSalt: { type: 'string', minLength: 32, maxLength: 32 },
        refreshTokenSalt: { type: 'string', minLength: 32, maxLength: 32 },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        privileges: { type: 'array', items: { type: 'string' } },
      }
    }
  },

  actions: {
    getSchema(ctx) {
      return {
        schema: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', $comment: JSON.stringify({ displayAsTableColumn: true }) },
            firstName: { type: 'string', $comment: JSON.stringify({ displayAsTableColumn: true }) },
            lastName: { type: 'string', $comment: JSON.stringify({ displayAsTableColumn: true }) },
            privileges: { type: 'array', items: { type: 'string' } },
          }
        },
        icon: 'people',
        displayName: 'Users',
        fields: [
          { label: 'E-mail', name: 'email', displayAsTableColumn: true },
          { label: 'Name', name: 'firstName', displayAsTableColumn: true },
          { label: 'Last name', name: 'lastName', displayAsTableColumn: true },
          { label: 'Privileges', name: 'privileges', displayAsTableColumn: true },
        ],
      }
    },
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