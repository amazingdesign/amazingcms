const { MoleculerError } = require('moleculer').Errors

const { makeCollectionService } = require('../mixins/collection.mixin')

module.exports = {
  name: 'collections-loader',

  started() {
    this.broker.waitForServices('collections')
      .then(() => this.broker.call('collections.find'))
      .then(collectionsData => collectionsData.map(this.createServiceFromCollectionData))
      .then(collectionsStartPromises => Promise.all(collectionsStartPromises))
  },

  actions: {
    load(ctx) { // alias for loadCollectionAsService
      return this.loadCollectionAsService(ctx)
    },
    loadCollectionAsService(ctx) {
      return this.loadCollectionAsService(ctx)
    }
  },

  methods: {
    loadCollectionAsService(ctx) {
      const { collectionName } = ctx.params

      return this.broker.call('collections.find', {
        query: {
          name: collectionName,
        }
      })
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