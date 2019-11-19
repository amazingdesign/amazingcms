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
      name: 'string',
      privileges: 'array',
    }
  },

  methods: {
    throwWhenNameExists(ctx) {
      return this.throwWhenFieldExists('name')(ctx)
    }
  }
}