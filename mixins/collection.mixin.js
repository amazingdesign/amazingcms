const DbService = require('../db/main')

const { findFirstLevelSlugFields } = require('@bit/amazingdesign.uniforms.find-first-level-slug-fields')
const DbMetadata = require('@bit/amazingdesign.moleculer.db-metadatamixin')
const DbUtilsMixin = require('../bits/db-utilsmixin')
const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')
const DbArchiveMixin = require('../bits/db-archive.mixin')

const makeCollectionService = collectionData => {
  const fieldsNames = Object.keys(collectionData.schema.properties)

  return {
    name: collectionData.name,

    hooks: {
      before: {
        create: 'throwWhenSlugsExists',
        update: 'throwWhenSlugsExists',
      }
    },

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
    },

    methods: {
      throwWhenSlugsExists(ctx) {
        const slugs = findFirstLevelSlugFields(collectionData.schema)

        this.logger.warn(slugs)

        if (slugs.length === 0) return ctx

        const checkPromises = slugs.map(({ fieldName }) => this.throwWhenFieldExists(fieldName)(ctx))

        return Promise.all(checkPromises).then(() => ctx)
      },
    }
  }
}

module.exports = {
  makeCollectionService
}