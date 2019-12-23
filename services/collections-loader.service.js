const { MoleculerError } = require('moleculer').Errors

const { makeCollectionService } = require('../mixins/collection.mixin')

module.exports = {
  name: 'collections-loader',

  events: {
    'collections.update': function (payload, nodeId, fullActionName) {
      const nameOfServiceToReload = payload.name

      this.logger.warn(`Collection ${nameOfServiceToReload} updated! Reloading...`)

      return this.destroyAllCollectionServices(nameOfServiceToReload)
        .then(() => this.loadCollectionAsService(nameOfServiceToReload))
        .then(() => this.logger.warn(`Collection ${nameOfServiceToReload} successfully reloaded!`))
    },
  },

  started() {
    this.broker.waitForServices(['collections', 'languages'])
      // we must pass meta raw here, because we cant prepareCollectionsSchema from collections
      // that arent loaded yet - they are will be loaded now
      .then(() => this.broker.call('collections.find', {}, { meta: { raw: true } }))
      .then(collectionsData => collectionsData.map(this.createServiceFromCollectionData))
      .then(collectionsStartPromises => Promise.all(collectionsStartPromises))
  },

  actions: {
    load(ctx) { // alias for loadCollectionAsService
      return this.loadCollectionAsService(ctx)
    },
    loadCollectionAsService(ctx) {
      const { collectionName } = ctx.params
      return this.loadCollectionAsService(collectionName)
    }
  },

  methods: {
    destroyAllCollectionServices(collectionName) {
      return this.broker.call('languages.find')
        .then(languagesData => {
          if (languagesData.length === 0) return Promise.resolve()

          return Promise.all(languagesData.map(languageData => {
            this.destroyServiceByName(collectionName + '__' + languageData.code)
          }))
        })
    },
    destroyServiceByName(serviceName) {
      return this.broker.destroyService(this.broker.getLocalService(serviceName))
    },
    loadCollectionAsService(collectionName) {
      return this.broker.call(
        'collections.find',
        { query: { name: collectionName } },
        { meta: { raw: true } }
      )
        .then(collectionsData => {
          if (collectionsData.length !== 1) {
            return Promise.reject(
              new MoleculerError(`Service ${collectionName} not found in collections.`, 404, 'SERVICE_NOT_FOUND')
            )
          }

          return collectionsData[0]
        })
        .then(this.createServiceFromCollectionData)
    },
    createServiceFromCollectionData(collectionData) {
      return this.broker.call('languages.find')
        .then(languagesData => {
          if (languagesData.length === 0) {
            return Promise.reject(new Error('No languages found. Cant create service without language!'))
          }

          const servicesCreationPromises = languagesData.map(languageData => {
            const collectionName = collectionData.name + '__' + languageData.code

            this.broker.createService(
              makeCollectionService({
                ...collectionData,
                name: collectionName
              })
            )

            return this.broker.waitForServices(collectionName)
          })

          return Promise.all(servicesCreationPromises)
        })
    },
  }

}