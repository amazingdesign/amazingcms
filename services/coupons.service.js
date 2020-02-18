/* eslint-disable max-lines */
const DbService = require('../db/main')
const DbMetadata = require('@bit/amazingdesign.moleculer.db-metadatamixin')
const DbUtilsMixin = require('../bits/db-utilsmixin')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')
const DbArchiveMixin = require('../bits/db-archive.mixin')

module.exports = {
  name: 'coupons',

  collection: 'coupons',

  mixins: [
    DbArchiveMixin,
    DbService,
    DbMetadata,
    DbUtilsMixin,
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
      insert: ['superadmin'],
      create: ['superadmin'],
      get: ['superadmin'],
      update: ['superadmin'],
      remove: ['superadmin'],
      getSchema: ['superadmin'],
    },
    fields: [
      '_id',
      'name',
      'active',
      'description',
      'percentDiscount',
      'createdAt',
      'updatedAt',
    ],
    entityValidator: {
      type: 'object',
      required: ['name', 'active', 'percentDiscount'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        percentDiscount: { type: 'number' },
        active: { type: 'string' },
      }
    },
  },

  actions: {
    async getSchema(ctx) {
      return {
        schema: {
          type: 'object',
          required: ['name', 'active', 'percentDiscount'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            percentDiscount: { type: 'number', uniforms: { fullWidth: true } },
            active: {
              type: 'string',
              defaultValue: 'false',
              options: [
                {
                  value: 'false',
                  label: 'No'
                },
                {
                  value: 'true',
                  label: 'Yes'
                }
              ],
            },
          }
        },
        icon: 'fas fa-tag',
        displayName: 'Coupons',
        tableFields: [
          { label: 'Active', name: 'active', columnRenderType: 'boolean-icon' },
          { label: 'Name', name: 'name', columnRenderType: 'chips' },
          { label: 'Description', name: 'description', },
          { label: '% discount', name: 'percentDiscount' },
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