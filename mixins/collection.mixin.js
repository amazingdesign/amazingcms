const DbService = require('../db/main')
const DbMetadata = require('@bit/amazingdesign.moleculer.db-metadatamixin')
const DbUtilsMixin = require('../bits/db-utilsmixin')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')
const DbArchiveMixin = require('../bits/db-archive.mixin')

const makeCollectionService = collectionData => {
  const fieldsNames = Object.keys(collectionData.schema.properties)

  return {
    name: collectionData.name,

    mixins: [
      DbArchiveMixin,
      DbService,
      DbMetadata,
      DbUtilsMixin,
      EventDispatcherMixin,
    ],

    collection: `collection-${collectionData.name}`,

    settings: {
      singleton: collectionData.singleton,
      requiredPrivileges: collectionData.requiredPrivileges,
      itemPrivileges: collectionData.itemPrivileges,
      fields: ['_id', '_archived', 'createdAt', 'updatedAt'].concat(fieldsNames),
      entityValidator: collectionData.validator,
      populates: collectionData.populateSchema,
      maxPageSize: Number.MAX_SAFE_INTEGER,
    }
  }
}

module.exports = {
  makeCollectionService
}