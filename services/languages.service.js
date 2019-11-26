const DbService = require('../db/main')
const DbUtilsMixin = require('@bit/amazingdesign.moleculer.db-utilsmixin')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')

module.exports = {
  name: 'languages',

  collection: 'languages',

  mixins: [
    DbService,
    DbUtilsMixin,
    EventDispatcherMixin,
  ],

  hooks: {
    before: {
      'create': [
        'throwWhenLanguageCodeExists',
      ]
    }
  },

  settings: {
    fields: ['_id', 'name', 'code'],
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
        fields: [
          { label: 'Name', name: 'name', displayAsTableColumn: true },
          { label: 'Code', name: 'code', displayAsTableColumn: true },
        ],
      }
    },
  },

  methods: {
    throwWhenLanguageCodeExists(ctx) {
      return this.throwWhenFieldExists('code')(ctx)
    }
  }
}