const DbService = require('../db/main')
const DbMetadata = require('@bit/amazingdesign.moleculer.db-metadatamixin')
const DbUtilsMixin = require('@bit/amazingdesign.moleculer.db-utilsmixin')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')

const makeCollectionService = collectionData => {
  const fieldsNames = collectionData.fields.map(field => field.name)

  return {
    name: collectionData.name,

    mixins: [
      DbService,
      DbMetadata,
      DbUtilsMixin,
      EventDispatcherMixin,
    ],

    collection: `collection-${collectionData.name}`,

    settings: {
      singleton: collectionData.singleton,
      requiredPrivileges: collectionData.requiredPrivileges,
      fields: ['_id', 'createdAt', 'updatedAt'].concat(fieldsNames),
      entityValidator: collectionData.validator
    }
  }
}

module.exports = {
  makeCollectionService
}