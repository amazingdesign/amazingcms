/* eslint-disable max-lines */
const { mapValues } = require('lodash')
const { resolveNestedPromises } = require('resolve-nested-promises')

const DbService = require('../db/main')
const DbUtilsMixin = require('../bits/db-utilsmixin')
const DbMetadata = require('@bit/amazingdesign.moleculer.db-metadatamixin')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')
const DbArchiveMixin = require('../bits/db-archive.mixin')

const COLUMN_RENDER_TYPES = [
  'avatar',
  'chips',
  'chips-lookup',
  'date',
  'date-time',
  'time-from-now',
  'currency',
  'stringify'
]

module.exports = {
  name: 'collections',

  collection: 'collections',

  mixins: [
    DbArchiveMixin,
    DbService,
    DbUtilsMixin,
    DbMetadata,
    EventDispatcherMixin,
  ],

  hooks: {
    before: {
      'create': [
        'throwWhenNameExists',
      ],
    },
    after: {
      '*': 'prepareCollectionsSchema',
    }
  },

  settings: {
    requiredPrivileges: {
      count: ['admin', 'superadmin'],
      get: ['admin', 'superadmin'],
      list: ['admin', 'superadmin'],
      find: ['admin', 'superadmin'],
      create: ['superadmin'],
      insert: ['superadmin'],
      update: ['superadmin'],
      remove: ['superadmin'],
    },
    fields: [
      '_id',
      'name',
      'displayName',
      'icon',
      'tableFields',
      'schema',
      'populateSchema',
      'requiredPrivileges',
      'itemPrivileges',
      'singleton',
      'createdAt',
      'updatedAt',
    ],
    entityValidator: {
      required: ['name', 'schema'],
      type: 'object',
      properties: {
        name: { type: 'string' },
        displayName: { type: 'string' },
        icon: { type: 'string' },
        tableFields: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              label: { type: 'string' },
              columnRenderType: { type: 'string', enum: COLUMN_RENDER_TYPES },
              lookup: {
                type: 'object',
                properties: {},
              }
            },
          },
          uniforms: { component: 'ListFieldReorder' }
        },
        schema: { $ref: 'http://json-schema.org/draft-07/schema#' },
        populateSchema: { 
          type: 'object', 
          properties: {}
        },
        requiredPrivileges: {
          type: 'object',
          additionalProperties: false,
          properties: {
            count: { type: 'array', items: { type: 'string' } },
            list: { type: 'array', items: { type: 'string' } },
            create: { type: 'array', items: { type: 'string' } },
            insert: { type: 'array', items: { type: 'string' } },
            get: { type: 'array', items: { type: 'string' } },
            update: { type: 'array', items: { type: 'string' } },
            remove: { type: 'array', items: { type: 'string' } },
          },
        },
        itemPrivileges: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              privileges: { type: 'array', items: { type: 'string' } },
              tokenPath: { type: 'string' },
              itemPath: { type: 'string' },
            }
          },
        },
        singleton: { type: 'boolean' }
      }
    },
  },

  actions: {
    async getSchema(ctx) {
      return {
        schema: {
          required: ['name', 'tableFields'],
          type: 'object',
          properties: {
            name: { type: 'string' },
            displayName: { type: 'string' },
            icon: { type: 'string' },
            tableFields: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  name: { type: 'string' },
                  label: { type: 'string' },
                  columnRenderType: { type: 'string', enum: COLUMN_RENDER_TYPES },
                  lookup: {
                    type: 'object',
                    properties: {
                      serviceName: { type: 'string' }
                    }
                  }
                },
              },
              uniforms: { component: 'ListFieldReorder' }
            },
            schema: { type: 'object', properties: {}, uniforms: { component: 'MonacoEditorField', language: 'json' } },
            populateSchema: { 
              type: 'object', 
              properties: {}, 
              uniforms: { component: 'MonacoEditorField', language: 'json' } 
            },
            requiredPrivileges: {
              type: 'object',
              additionalProperties: false,
              properties: {
                count: { $ref: '#/definitions/privileges' },
                list: { $ref: '#/definitions/privileges' },
                create: { $ref: '#/definitions/privileges' },
                insert: { $ref: '#/definitions/privileges' },
                get: { $ref: '#/definitions/privileges' },
                update: { $ref: '#/definitions/privileges' },
                remove: { $ref: '#/definitions/privileges' },
              },
            },
            itemPrivileges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  privileges: { $ref: '#/definitions/privileges' },
                  tokenPath: { type: 'string' },
                  itemPath: { type: 'string' },
                }
              },
              uniforms: { component: 'ListFieldReorder' }
            },
            singleton: { type: 'boolean' }
          },
          definitions: {
            privileges: {
              type: 'array',
              items: { type: 'string' },
              options: await this.createOptionsFromService('privileges', 'name', 'name'),
              uniforms: { component: 'MuiReactSelectField' },
            }
          }
        },
        icon: 'fas fa-database',
        displayName: 'Collections',
        tableFields: [
          { label: 'Name', name: 'displayName' },
          { label: 'System name', name: 'name' },
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
    },
    async prepareCollectionsSchema(ctx, res) {
      if (ctx.meta.raw) return res

      const actionName = ctx.action.rawName

      const modifySchemaInSingleItemResponse = (res) => ({
        ...res,
        schema: this.prepareCollectionSchema(res.schema),
        tableFields: res.tableFields && res.tableFields.map(tableField => this.prepareCollectionSchema(tableField)),
      })

      switch (actionName) {
        case 'find':
          return resolveNestedPromises(res.map(modifySchemaInSingleItemResponse))
        case 'list':
          return resolveNestedPromises({
            ...res,
            rows: res.rows.map(modifySchemaInSingleItemResponse)
          })
        case 'get':
          return resolveNestedPromises(modifySchemaInSingleItemResponse(res))
            .then(result => {
              return result
            })
        default:
          return res
      }
    },
    prepareCollectionSchema(schema) {
      const fillSchemaWithOptions = (object) => mapValues(
        object,
        (value, key) => {
          if (typeof value !== 'object') return value
          if (Array.isArray(value)) return value
          if (value === null) return value

          switch (key) {
            case 'options':
              return this.createOptionsFromService(
                value.serviceName,
                value.labelFieldName,
                value.valueFieldName,
              )
            case 'lookup':
              if (!value.serviceName) return value

              return this.createLookupFromService(
                value.serviceName,
                value.labelFieldName,
                value.valueFieldName,
              )
            default:
              return fillSchemaWithOptions(value)
          }
        }
      )

      const schemaFilledWithPromises = fillSchemaWithOptions(schema)

      return schemaFilledWithPromises
    }
  }

}