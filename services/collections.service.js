const DbService = require('../db/main')
const DbUtilsMixin = require('@bit/amazingdesign.moleculer.db-utilsmixin')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')

module.exports = {
  name: 'collections',

  collection: 'collections',

  mixins: [
    DbService,
    DbUtilsMixin,
    EventDispatcherMixin,
  ],

  hooks: {
    before: {
      'create': [
        'throwWhenNameExists',
      ],
    },
  },

  settings: {
    requiredPrivileges: {
      count: ['admin', 'superadmin'],
      get: ['admin', 'superadmin'],
      list: ['admin', 'superadmin'],
      create: ['superadmin'],
      insert: ['superadmin'],
      update: ['superadmin'],
      remove: ['superadmin'],
    },
    fields: [
      '_id',
      'name',
      'displayName',
      'fields',
      'schema',
      'requiredPrivileges',
      'singleton',
    ],
    entityValidator: {
      required: ['name', 'fields'],
      type: 'object',
      properties: {
        name: { type: 'string' },
        displayName: { type: 'string' },
        fields: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              fieldType: { type: 'string' },
              name: { type: 'string' },
              label: { type: 'string' },
              props: { type: 'object' },
              displayAsTableColumn: { type: 'boolean' },
              initialValue: {},
            },
          },
        },
        schema: { $ref: 'http://json-schema.org/draft-07/schema#' },
        requiredPrivileges: {
          type: 'object',
          additionalProperties: false,
          properties: {
            count: { type: 'array', items: { type: 'string' } },
            list: { type: 'array', items: { type: 'string' } },
            create: { type: 'array', items: { type: 'string' } },
            insert: { type: 'array', items: { type: 'string' } },
            get: { type: 'array', items: { type: 'string' } },
            update: { type: 'array', items: { type: 'string' } },
            remove: { type: 'array', items: { type: 'string' } },
          },
        },
        singleton: { type: 'boolean' }
      }
    },
  },

  methods: {
    throwWhenNameExists(ctx) {
      return this.throwWhenFieldExists('name')(ctx)
    }
  }

}