const DbService = require('../db/main')
const DbUtilsMixin = require('../bits/db-utilsmixin')
const DbMetadata = require('@bit/amazingdesign.moleculer.db-metadatamixin')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')

module.exports = {
  name: 'groups',

  collection: 'groups',

  mixins: [
    DbService,
    DbUtilsMixin,
    DbMetadata,
    EventDispatcherMixin,
  ],

  hooks: {
    before: {
      'create': [
        'throwWhenNameExists',
      ]
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
    fields: ['_id', 'name', 'privileges', 'createdAt', 'updatedAt'],
    entityValidator: {
      type: 'object',
      required: ['name', 'privileges'],
      properties: {
        name: { type: 'string' },
        privileges: { type: 'array', items: { type: 'string' } },
      }
    },
    populates: {
      privileges: 'privileges.get',
    }
  },

  actions: {
    async getSchema(ctx) {
      return {
        schema: {
          type: 'object',
          required: ['name', 'privileges'],
          properties: {
            name: { type: 'string' },
            privileges: {
              type: 'array',
              items: { type: 'string' },
              options: await this.createOptionsFromService('privileges'),
              uniforms: { checkboxes: true },
            },
          }
        },
        icon: 'fas fa-users',
        displayName: 'Groups',
        tableFields: [
          { label: 'Name', name: 'name', displayAsTableColumn: true },
          {
            label: 'Privileges',
            name: 'privileges',
            displayAsTableColumn: true,
            columnRenderType: 'chips-lookup',
            lookup: await this.createLookupFromService('privileges'),
          },
          { label: 'Created', name: 'createdAt', columnRenderType: 'date-time' },
          { label: 'Updated', name: 'updatedAt', columnRenderType: 'date-time' },
        ],
      }
    },
  },

  methods: {
    throwWhenNameExists(ctx) {
      return this.throwWhenFieldExists('name')(ctx)
    }
  }
}