'use strict'

const { ServiceNotFoundError } = require('moleculer').Errors

module.exports = {
  name: 'actions',

  hooks: {
    before: {
      '*': [
        'deleteReqParams'
      ]
    },
    after: {
      '*': [
        'forward'
      ]
    }
  },

  actions: ['list', 'get', 'create', 'update', 'remove'].reduce(
    (r, collectionName) => ({
      ...r,
      [collectionName]: (ctx) => { }
    }),
    {}
  ),

  methods: {
    deleteReqParams(ctx) {
      delete ctx.params.collectionName
      delete ctx.params.language

      return ctx
    },
    forward(ctx) {
      const { collectionName, language = 'pl' } = ctx.meta
      const { rawName: action } = ctx.action

      const collectionNameWithLanguage = `${collectionName}__${language}`

      this.logger.info(
        `Asked to perform ${action} on ${collectionNameWithLanguage}. Calling ${collectionNameWithLanguage}.${action}`
      )

      return this.broker.call(`${collectionNameWithLanguage}.${action}`, ctx.params, { meta: ctx.meta })
        .catch((error) => {
          if (!(error instanceof ServiceNotFoundError)) {
            return Promise.reject(error)
          }

          this.logger.info(`Service ${collectionNameWithLanguage}.${action} not exists. Trying to create it.`)

          return this.broker.call(
            'collections-loader.loadCollectionAsService',
            { collectionName }
          )
            .then(() => this.broker.call(`${collectionNameWithLanguage}.${action}`, ctx.params, { meta: ctx.meta }))
        })

    },
  },

}