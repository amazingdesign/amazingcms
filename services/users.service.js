/* eslint-disable max-lines */
'use strict'

const DbService = require('../db/main')
const DbUtilsMixin = require('../bits/db-utilsmixin')
const DbMetadata = require('@bit/amazingdesign.moleculer.db-metadatamixin')

const generateSalt = require('@bit/amazingdesign.utils.generate-salt')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')
const DbArchiveMixin = require('../bits/db-archive.mixin')

module.exports = {
  name: 'users',

  collection: 'users',

  mixins: [
    DbArchiveMixin,
    DbService,
    DbUtilsMixin,
    DbMetadata,
    EventDispatcherMixin,
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
        'throwWhenUserExists',
      ],
      'insert': () => { return Promise.reject(new Error('Method not allowed!')) }
    },
    after: {
      '*': 'removeSecretFieldsFromResponseIfCalledByApi',
    }
  },

  settings: {
    requiredPrivileges: {
      count: ['superadmin', 'admin'],
      list: ['superadmin', 'admin'],
      create: ['superadmin'],
      insert: ['superadmin'],
      get: ['superadmin', 'admin'],
      update: ['superadmin'],
      remove: ['superadmin'],
      getSchema: ['superadmin'],
    },
    fields: [
      '_id',
      '_archived',
      'email',
      'avatar',
      'password',
      'passwordSalt',
      'refreshTokenSalt',
      'firstName',
      'lastName',
      'groups',
      'createdAt',
      'updatedAt',
    ]
    ,
    entityValidator: {
      type: 'object',
      required: ['email', 'password', 'passwordSalt', 'refreshTokenSalt'],
      properties: {
        email: { type: 'string', format: 'email' },
        avatar: {
          type: 'object',
          properties: {},
        },
        password: { type: 'string', minLength: 1024, maxLength: 1024 },
        passwordSalt: { type: 'string', minLength: 32, maxLength: 32 },
        refreshTokenSalt: { type: 'string', minLength: 32, maxLength: 32 },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        groups: { type: 'array', items: { type: 'string' } },
      }
    },
    populates: {
      groups: {
        action: 'groups.get',
        populate: ['privileges']
      },
    }
  },

  actions: {
    async getSchema(ctx) {
      return {
        schema: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
            avatar: {
              type: 'object',
              properties: {},
              uniforms: {
                component: 'FileField',
                bucketName: 'photos',
                dropzoneProps: {
                  accept: ['image/jpeg', 'image/png'],
                  maxSize: 51200, // 50 KB
                },
              },
            },
            password: { type: 'string', uniforms: { type: 'password' } },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            groups: {
              type: 'array',
              items: { type: 'string' },
              options: await this.createOptionsFromService('groups'),
              uniforms: { component: 'MuiReactSelectField' },
            },
          }
        },
        icon: 'fas fa-user',
        displayName: 'Users',
        tableFields: [
          { label: 'Avatar', name: 'avatar', columnRenderType: 'avatar' },
          { label: 'E-mail', name: 'email' },
          { label: 'Name', name: 'firstName' },
          { label: 'Last name', name: 'lastName' },
          {
            label: 'Groups',
            name: 'groups',
            columnRenderType: 'chips-lookup',
            lookup: await this.createLookupFromService('groups'),
          },
          { label: 'Created', name: 'createdAt', columnRenderType: 'date-time' },
          { label: 'Updated', name: 'updatedAt', columnRenderType: 'date-time' },
        ],
        requiredPrivileges: this.settings.requiredPrivileges,
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