const DbService = require('../db/main')
const DbMetadata = require('@bit/amazingdesign.moleculer.db-metadatamixin')
const DbUtilsMixin = require('../bits/db-utilsmixin')
const DbArchiveMixin = require('../bits/db-archive.mixin')

module.exports = {
  name: 'events-log',

  collection: 'events-log',

  mixins: [
    DbArchiveMixin,
    DbService,
    DbMetadata,
    DbUtilsMixin,
  ],

  hooks: {},

  settings: {
    requiredPrivileges: {
      count: ['superadmin'],
      get: ['superadmin'],
      list: ['superadmin'],
      find: ['superadmin'],
      create: ['$NONE'],
      insert: ['$NONE'],
      update: ['$NONE'],
      remove: ['$NONE'],
      getSchema: ['$NONE'],
    },
    fields: ['_id', 'action', 'level', 'message', 'data', 'createdAt', 'updatedAt'],
    entityValidator: {
      type: 'object',
      required: ['action', 'level', 'message'],
      properties: {
        action: { type: 'string' },
        level: { type: 'string' },
        message: { type: 'string' },
      },
    }
  },

  actions: {
    async getSchema(ctx) {
      return {
        schema: {
          type: 'object',
          required: ['action', 'level', 'message'],
          properties: {
            action: { type: 'string' },
            level: { type: 'string' },
            message: { type: 'string' },
          },
        },
        icon: 'fas fa-stream',
        displayName: 'Events log',
        tableFields: [
          { label: 'Action', name: 'action', displayAsTableColumn: true },
          { label: 'Level', name: 'level', displayAsTableColumn: true },
          { label: 'Message', name: 'message', displayAsTableColumn: true },
          { label: 'Data', name: 'data', displayAsTableColumn: true, columnRenderType: 'stringify' },
          { label: 'Created', name: 'createdAt', columnRenderType: 'date-time' },
          { label: 'Updated', name: 'updatedAt', columnRenderType: 'date-time' },
        ],
        requiredPrivileges: this.settings.requiredPrivileges,
      }
    },
  },
}