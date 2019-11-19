const DbService = require('../db/main')
const DbUtilsMixin = require('@bit/amazingdesign.moleculer.db-utilsmixin')

module.exports = {
  name: 'languages',

  collection: 'languages',

  mixins: [
    DbService,
    DbUtilsMixin
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

  methods: {
    throwWhenLanguageCodeExists(ctx) {
      return this.throwWhenFieldExists('code')(ctx)
    }
  }
}