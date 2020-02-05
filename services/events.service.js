const vm = require('vm')

const DbService = require('../db/main')
const DbMetadata = require('@bit/amazingdesign.moleculer.db-metadatamixin')
const DbUtilsMixin = require('../bits/db-utilsmixin')
const DbArchiveMixin = require('../bits/db-archive.mixin')

const EXCLUDE = ['events-log']
const MUST_INCLUDE = ['update', 'create']

module.exports = {
  name: 'events',

  collection: 'events',

  mixins: [
    DbArchiveMixin,
    DbService,
    DbMetadata,
    DbUtilsMixin,
  ],

  events: {
    '**': function (payload, nodeId, fullActionName) {
      // prevent endless loop
      if(EXCLUDE.find(excludedName => fullActionName.includes(excludedName))) return
      // prevent events for unnecessary no mutating actions
      if(!MUST_INCLUDE.find(excludedName => fullActionName.includes(excludedName))) return

      this.eventLog(fullActionName, 'Event heard!')

      this.broker.call('events.find', { query: { action: fullActionName } })
        .then((events) => {
          if (events.length === 0) {
            this.eventLog(fullActionName, 'No chained events found! Skipping!')
            return
          }

          this.eventLog(fullActionName, `Found ${events.length} chained events. Triggering...`)

          return Promise.all(
            events.map((event) => this.executeEvent(event.code, payload))
          ).then((results) => {
            this.eventLog(fullActionName, 'All chained events for triggered successfully!', results)
          })
        })
        .catch((error) => {
          this.eventLog(fullActionName, 'Error occurred when processing chained events!', error.message, 'error')
        })
    }
  },

  hooks: {},

  dependencies: [
    'events-log',
  ],

  settings: {
    requiredPrivileges: {
      count: ['superadmin'],
      list: ['superadmin'],
      create: ['superadmin'],
      insert: ['superadmin'],
      get: ['superadmin'],
      update: ['superadmin'],
      remove: ['superadmin'],
      getSchema: ['superadmin'],
    },
    fields: ['_id', '_archived', 'name', 'action', 'code', 'createdAt', 'updatedAt'],
    entityValidator: {
      type: 'object',
      required: ['name', 'action', 'code'],
      properties: {
        name: { type: 'string' },
        action: { type: 'string' },
        code: { type: 'string' },
      },
    }
  },

  actions: {
    async getSchema(ctx) {
      return {
        schema: {
          type: 'object',
          required: ['name', 'action', 'code'],
          properties: {
            name: { type: 'string' },
            action: { type: 'string' },
            code: { type: 'string', uniforms: { component: 'MonacoEditorField' } },
          },
        },
        icon: 'fas fa-network-wired',
        displayName: 'Events',
        tableFields: [
          { label: 'Name', name: 'name', displayAsTableColumn: true },
          { label: 'Action', name: 'action', displayAsTableColumn: true },
          { label: 'Created', name: 'createdAt', columnRenderType: 'date-time' },
          { label: 'Updated', name: 'updatedAt', columnRenderType: 'date-time' },
        ],
        requiredPrivileges: this.settings.requiredPrivileges,
      }
    },
  },

  methods: {
    executeEvent(code, payload) {
      const script = new vm.Script(`(() => { ${code} })()`)

      const call = (...all) => this.broker.call(...all)

      const context = vm.createContext({ call, payload: JSON.parse(JSON.stringify(payload)), axios: require('axios') })

      return script.runInContext(context)
    },
    eventLog(action, message, data, level = 'info') {
      const log = (msg) => this.logger[level](`[${action}] ${msg}`)

      log(message)
      if (data) log(data)

      this.broker
        .call('events-log.create', { action, level, message, data })
        .catch((error) => {
          this.logger.error(`[${action}] Cant save log into events-log! Error message: ${error.message}`)
        })
    }
  }
}