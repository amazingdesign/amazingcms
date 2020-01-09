'use strict'

const promiseRetry = require('promise-retry')

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

  actions: ['list', 'find', 'get', 'create', 'update', 'remove'].reduce(
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
      // @TODO default lang form settings maybe
      const { collectionName, language = 'pl' } = ctx.meta
      const { rawName: action } = ctx.action

      const collectionNameWithLanguage = `${collectionName}__${language}`

      this.logger.info(
        `Asked to perform ${action} on ${collectionNameWithLanguage}. Calling ${collectionNameWithLanguage}.${action}`
      )

      const call = (retry) => (
        this.broker.call(`${collectionNameWithLanguage}.${action}`, ctx.params, { meta: ctx.meta })
          .catch(this.tryToCreateServiceIfNotExist(ctx))
          .catch(retry)
      )

      return promiseRetry(call, { retries: 2 })
    },
    tryToCreateServiceIfNotExist(ctx, prevCollections = []) {
      return (error) => {
        if (!(error instanceof ServiceNotFoundError)) {
          return Promise.reject(error)
        }
        const actionCausedError = error.data.action
        const collectionNameWithLanguage = actionCausedError.split('.')[0]
        const action = actionCausedError.split('.')[1]
        const collectionName = actionCausedError.split('__')[0]

        this.logger.info(`Service ${collectionNameWithLanguage}.${action} not exists. Trying to create it.`)

        const collectionsToLoad = prevCollections.concat(collectionName)

        const loadPromise = collectionsToLoad.reverse().reduce(
          (r, collectionName) => r.then(() => this.broker.call('collections-loader.loadCollectionAsService', { collectionName })),
          Promise.resolve()
        )

        return loadPromise
          .then(() => this.broker.call(`${collectionNameWithLanguage}.${action}`, ctx.params, { meta: ctx.meta }))
          // it is possible that dependent services not exist
          .catch(this.tryToCreateServiceIfNotExist(ctx, collectionsToLoad))
      }
    }
  },

}