const DbService = require('../db/main')
const DbUtilsMixin = require('../bits/db-utilsmixin')
const DbMetadata = require('@bit/amazingdesign.moleculer.db-metadatamixin')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')
const DbArchiveMixin = require('../bits/db-archive.mixin')

module.exports = {
  name: 'languages',

  collection: 'languages',

  mixins: [
    DbArchiveMixin,
    DbService,
    DbUtilsMixin,
    DbMetadata,
    EventDispatcherMixin,
  ],

  hooks: {
    before: {
      create: 'throwWhenLanguageCodeExists',
      update: 'throwWhenLanguageCodeExists',
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
    fields: ['_id', 'name', 'code', 'createdAt', 'updatedAt'],
    entityValidator: {
      type: 'object',
      required: ['name', 'code'],
      properties: {
        name: { type: 'string' },
        code: { type: 'string' },
      },
    }
  },

  actions: {
    async getSchema(ctx) {
      return {
        schema: {
          type: 'object',
          required: ['name', 'code'],
          properties: {
            name: { type: 'string' },
            code: { type: 'string' },
          },
        },
        icon: 'fas fa-language',
        displayName: 'Languages',
        tableFields: [
          { label: 'Name', name: 'name', displayAsTableColumn: true },
          { label: 'Code', name: 'code', displayAsTableColumn: true },
          { label: 'Created', name: 'createdAt', columnRenderType: 'date-time' },
          { label: 'Updated', name: 'updatedAt', columnRenderType: 'date-time' },
        ],
        requiredPrivileges: this.settings.requiredPrivileges,
      }
    },
  },

  methods: {
    throwWhenLanguageCodeExists(ctx) {
      return this.throwWhenFieldExists('code')(ctx)
    }
  }
}