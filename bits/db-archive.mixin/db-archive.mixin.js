const { Errors: WebErrors } = require('moleculer-web')
const { mapValues } = require('lodash')

module.exports = {
  hooks: {
    before: {
      '*': [
        'defaultDoNotShowArchived',
        'makeArchivedBoolean'
      ],
    },
  },

  actions: {
    remove(ctx) {
      const { params: { id } } = ctx

      return this.actions.get({ id })
        .then((item) => (
          this.actions.update({
            id: item._id,
            _archived: Boolean(!item._archived),
          })
        ))
    },
  },

  methods: {
    makeArchivedBoolean(ctx) {
      const mapAllStingsToBooleans = (item) => {
        if (typeof item === 'string') {
          if (item === 'false') return false
          if (item === '' || item === 'undefined') return undefined

          return Boolean(item)
        }
        if (Array.isArray(item)) return item.map(mapAllStingsToBooleans)
        if (typeof item === 'object') return mapValues(item, mapAllStingsToBooleans)

        return item
      }
      if (
        ctx.params &&
        ctx.params.query
      ) {
        console.log(ctx.params.query._archived)
        ctx.params.query._archived = mapAllStingsToBooleans(ctx.params.query._archived)
        console.log(ctx.params.query._archived)
      }


      return ctx
    },
    async defaultDoNotShowArchived(ctx) {
      if (ctx.meta && ctx.meta.skipNotShowArchived) return

      const actionName = ctx.action.rawName

      const addSearchParams = () => {
        const notArchivedQuery = { _archived: { $ne: true } }

        if (!ctx.params) ctx.params = { query: notArchivedQuery }
        if (!ctx.params.query) ctx.params.query = notArchivedQuery
        if (ctx.params.query._archived === undefined) ctx.params.query = { ...ctx.params.query, ...notArchivedQuery }
      }

      const getItemThenCheckIfIsArchived = async () => {
        const id = ctx.params.id
        const serviceName = ctx.action.name.split('.')[0]

        const item = await this.broker.call(`${serviceName}.get`, { id }, { meta: { skipNotShowArchived: true } })

        if (item._archived) {
          throw new WebErrors.NotFoundError()
        }
      }

      switch (actionName) {
        case 'find':
          addSearchParams()
          break
        case 'list':
          addSearchParams()
          break
        case 'count':
          addSearchParams()
          break
        case 'get':
          await getItemThenCheckIfIsArchived()
          break
        case 'update':
          await getItemThenCheckIfIsArchived()
          break
        case 'remove':
          // normal behaviour - first call archives second un-archives
          break
        case 'insert':
          // here is nothing to do - item does not exist
          break
        case 'create':
          // here is nothing to do - item does not exist
          break
      }
    },
  },

}