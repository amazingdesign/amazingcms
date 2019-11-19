const DbService = require('../db/main')
const DbUtilsMixin = require('@bit/amazingdesign.moleculer.db-utilsmixin')

const fastestValidatorSchemaChecker = require('@bit/amazingdesign.utils.fastest-validator-schema-checker')

module.exports = {
  name: 'collections',

  collection: 'collections',

  mixins: [
    DbService,
    DbUtilsMixin
  ],

  hooks: {
    before: {
      'create': [
        'throwWhenNameExists',
      ],
    },
  },

  settings: {
    requiredPrivileges: {
      count: ['admin', 'superadmin'],
      get: ['admin', 'superadmin'],
      list: ['admin', 'superadmin'],
      create: ['superadmin'],
      insert: ['superadmin'],
      update: ['superadmin'],
      remove: ['superadmin'],
    },
    fields: [
      '_id',
      'name',
      'displayName',
      'fields',
      'validator',
      'requiredPrivileges',
      'singleton',
    ],
    entityValidator: {
      name: 'string',
      displayName: { type: 'string', optional: true },
      fields: {
        type: 'array',
        min: 1,
        items: {
          $$strict: true,
          type: 'object',
          props: {
            fieldType: { type: 'string' },
            name: { type: 'string' },
            label: { type: 'string', optional: true },
            props: { type: 'object', optional: true },
            displayAsTableColumn: { type: 'boolean', optional: true },
            initialValue: { type: 'any', optional: true },
          },
        },
      },
      validator: {
        type: 'custom',
        check: fastestValidatorSchemaChecker,
        optional: true,
      },
      requiredPrivileges: {
        $$strict: true,
        type: 'object',
        props: {
          count: { type: 'array', items: 'string', optional: true },
          list: { type: 'array', items: 'string', optional: true },
          create: { type: 'array', items: 'string', optional: true },
          insert: { type: 'array', items: 'string', optional: true },
          get: { type: 'array', items: 'string', optional: true },
          update: { type: 'array', items: 'string', optional: true },
          remove: { type: 'array', items: 'string', optional: true },
        },
        optional: true,
      },
      singleton: { type: 'boolean', optional: true }
    },
  },

  methods: {
    throwWhenNameExists(ctx) {
      return this.throwWhenFieldExists('name')(ctx)
    }
  }

}