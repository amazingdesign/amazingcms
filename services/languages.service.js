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
      name: 'string',
      code: 'string',
    }
  },

  methods: {
    throwWhenLanguageCodeExists(ctx) {
      return this.throwWhenFieldExists('code')(ctx)
    }
  }
}