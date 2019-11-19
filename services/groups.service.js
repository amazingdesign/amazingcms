const DbService = require('../db/main')
const DbUtilsMixin = require('@bit/amazingdesign.moleculer.db-utilsmixin')

module.exports = {
  name: 'groups',

  collection: 'groups',

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
    fields: ['_id', 'name', 'privileges'],
    entityValidator: {
      type: 'object',
      required: ['name', 'privileges'],
      properties: {
        name: { type: 'string' },
        privileges: { type: 'array', items: { type: 'string' } },
      }
    }
  },

  methods: {
    throwWhenNameExists(ctx) {
      return this.throwWhenFieldExists('name')(ctx)
    }
  }
}