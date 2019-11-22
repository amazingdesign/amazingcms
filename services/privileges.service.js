const DbService = require('../db/main')
const DbUtilsMixin = require('@bit/amazingdesign.moleculer.db-utilsmixin')

module.exports = {
  name: 'privileges',

  collection: 'privileges',

  mixins: [
    DbService,
    DbUtilsMixin
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
    fields: ['_id', 'name'],
    entityValidator: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
      }
    }
  },

  actions: {
    getSchema(ctx) {
      return {
        schema: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
          }
        },
        icon: 'fas fa-shield-alt',
        displayName: 'Privileges',
        fields: [
          { label: 'Name', name: 'name', displayAsTableColumn: true },
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