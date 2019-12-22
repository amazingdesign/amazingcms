const DbService = require('../db/main')
const DbUtilsMixin = require('../bits/db-utilsmixin')
const DbMetadata = require('@bit/amazingdesign.moleculer.db-metadatamixin')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')
const DbArchiveMixin = require('../bits/db-archive.mixin')

module.exports = {
  name: 'privileges',

  collection: 'privileges',

  mixins: [
    DbArchiveMixin,
    DbService,
    DbUtilsMixin,
    DbMetadata,
    EventDispatcherMixin,
  ],

  hooks: {
    before: {
      create: 'throwWhenNameExists',
      update: 'throwWhenNameExists',
    }
  },

  settings: {
    requiredPrivileges: {
      count: ['superadmin'],
      list: ['superadmin'],
      create: ['superadmin'],
      insert: ['superadmin'],
      get: ['superadmin'],
      update: ['$NONE'],
      remove: ['$NONE'],
      getSchema: ['superadmin'],
    },
    fields: ['_id', 'name', 'createdAt', 'updatedAt'],
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
        tableFields: [
          { label: 'Name', name: 'name', displayAsTableColumn: true },
          { label: 'Created', name: 'createdAt', columnRenderType: 'date-time' },
          { label: 'Updated', name: 'updatedAt', columnRenderType: 'date-time' },
        ],
        requiredPrivileges: this.settings.requiredPrivileges,
      }
    },
  },

  methods: {
    throwWhenNameExists(ctx) {
      return this.throwWhenFieldExists('name')(ctx)
    }
  }
}