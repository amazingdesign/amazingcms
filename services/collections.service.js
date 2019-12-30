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
  'boolean-icon',
  'boolean',
  'button-link',
  'chips-lookup',
  'chips',
  'currency',
  'date-time',
  'date',
  'stringify',
  'time-from-now',
]

const BUTTON_LINK_VARIANTS = [
  'text',
  'contained',
  'outlined',
  'icon'
]
const BUTTON_LINK_COLORS = [
  'primary',
  'secondary'
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
      create: 'throwWhenNameExists',
      update: 'throwWhenNameExists',
    },
    after: {
      '*': 'prepareCollectionsSchema',
    }
  },

  settings: {
    requiredPrivileges: {
      _displayInAdmin: ['superadmin'],
      count: ['admin', 'superadmin', 'admin-panel-access'],
      get: ['admin', 'superadmin', 'admin-panel-access'],
      list: ['admin', 'superadmin', 'admin-panel-access'],
      find: ['admin', 'superadmin', 'admin-panel-access'],
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
              button: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  link: { type: 'string' },
                  variant: { type: 'string', enum: BUTTON_LINK_VARIANTS, default: BUTTON_LINK_VARIANTS[0] },
                  color: { type: 'string', enum: BUTTON_LINK_COLORS, default: BUTTON_LINK_COLORS[0] },
                }
              },
              lookup: {
                type: 'object',
                properties: {
                  serviceName: { type: 'string' },
                  labelFieldName: { type: 'string' },
                  valueFieldName: { type: 'string' },
                },
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
            _displayInAdmin: { type: 'array', items: { type: 'string' } },
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
              queryByPopulation: { type: 'boolean' }
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
                  button: {
                    type: 'object',
                    properties: {
                      label: { type: 'string' },
                      link: { type: 'string' },
                      variant: { type: 'string', enum: BUTTON_LINK_VARIANTS, default: BUTTON_LINK_VARIANTS[0] },
                      color: { type: 'string', enum: BUTTON_LINK_COLORS, default: BUTTON_LINK_COLORS[0] },
                    }
                  },
                  lookup: {
                    type: 'object',
                    properties: {
                      serviceName: { type: 'string' },
                      labelFieldName: { type: 'string' },
                      valueFieldName: { type: 'string' },
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
                _displayInAdmin: { $ref: '#/definitions/privileges' },
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
                  queryByPopulation: { type: 'boolean' }
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
              ).catch((error) => {
                this.logger.error('Cant load options. ' + error.message)
                return []
              })
            case 'lookup':
              if (!value.serviceName) return value

              return this.createLookupFromService(
                value.serviceName,
                value.labelFieldName,
                value.valueFieldName,
              ).catch((error) => {
                this.logger.error('Cant load lookup. ' + error.message)
                return []
              })
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