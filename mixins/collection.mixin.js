const vm = require('vm')
const DbService = require('../db/main')

const { findFirstLevelSlugFields } = require('@bit/amazingdesign.uniforms.find-first-level-slug-fields')
const DbMetadata = require('@bit/amazingdesign.moleculer.db-metadatamixin')
const DbUtilsMixin = require('../bits/db-utilsmixin')
const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')
const DbArchiveMixin = require('../bits/db-archive.mixin')

const makeCollectionService = collectionData => {
  const fieldsNames = Object.keys(collectionData.schema.properties)

  const serviceDeclaration = {
    name: collectionData.name,

    hooks: {
      before: {
        create: 'throwWhenSlugsExists',
        update: 'throwWhenSlugsExists',
      },
      after: {
        '*': 'executeAfterHook'
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
      afterHook: collectionData.afterHook,
    },

    methods: {
      throwWhenSlugsExists(ctx) {
        const slugs = findFirstLevelSlugFields(collectionData.schema)

        this.logger.warn(slugs)

        if (slugs.length === 0) return ctx

        const checkPromises = slugs.map(({ fieldName }) => this.throwWhenFieldExists(fieldName)(ctx))

        return Promise.all(checkPromises).then(() => ctx)
      },
      executeAfterHook(ctx, res) {
        this.logger.debug('Entering after hook!')

        const afterHook = this.settings.afterHook

        if(!this.settings.afterHook) return res

        this.logger.debug('Firing after hook!')
 
        const script = new vm.Script(`(() => { ${afterHook} })()`)

        const call = (...all) => this.broker.call(...all)

        const context = vm.createContext({
          call,
          res: JSON.parse(JSON.stringify(res)),
          axios: require('axios'),
          actionName: ctx.action.rawName,
          serviceName: ctx.action.name.split('.')[0],
          ctxParams: JSON.parse(JSON.stringify(ctx.params)),
          ctxMeta: JSON.parse(JSON.stringify(ctx.meta)),
        })
        
        return script.runInContext(context)
      },
    }
  }

  return serviceDeclaration
}

module.exports = {
  makeCollectionService
}