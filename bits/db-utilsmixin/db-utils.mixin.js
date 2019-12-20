/* eslint-disable max-lines */
'use strict'
const generateSalt = require('@bit/amazingdesign.utils.generate-salt')
const hashWithSalt = require('@bit/amazingdesign.utils.hash-with-salt')
const filterByPage = require('@bit/amazingdesign.utils.filter-by-page')
const { getValuesFromItem } = require('@bit/amazingdesign.utils.variables-in-string')

const _ = require('lodash')
const { default: sift } = require('sift')

const { MoleculerError } = require('moleculer').Errors
const { PrivilegesError, SingletonDataOverflow, QueryByPopulationValues } = require('./db-utils.errors')
const { Errors: WebErrors } = require('moleculer-web')

module.exports = {
  hooks: {
    before: {
      '*': [
        'singletonService',
        'privilegeChecker',
        'itemPrivilegesChecker',
        'queryByPopulation',
      ]
    },
    error: {
      '*': [
        'singletonOverflowErrorCatcher',
        'queryByPopulationValuesErrorCatcher'
      ]
    }
  },

  methods: {
    removeFieldFromResponses(fieldName) {

      return function (ctx, res) {
        const actionName = ctx.action.rawName

        switch (actionName) {
          case 'find':
            res = res.map(entity => {
              delete entity[fieldName]

              return entity
            })
            break
          case 'count':
            break
          case 'create':
            delete res[fieldName]
            break
          case 'list':
            res.rows = res.rows.map(entity => {
              delete entity[fieldName]

              return entity
            })
            break
          case 'insert':
            if (res instanceof Array) {
              res = res.map(entity => {
                delete entity[fieldName]

                return entity
              })
            } else {
              delete res[fieldName]
            }
            break
          case 'get':
            if (res instanceof Array) {
              res = res.map(entity => {
                delete entity[fieldName]

                return entity
              })
            } else {
              delete res[fieldName]
            }
            break

          case 'update':
            delete res[fieldName]
            break
          case 'remove':
            if (res instanceof Array) {
              res = res.map(entity => {
                delete entity[fieldName]

                return entity
              })
            } else {
              delete res[fieldName]
            }
            break
        }

        return res
      }

    },

    hashFieldWithSalt(fieldName) {
      return function (ctx) {
        const fieldValue = ctx.params[fieldName]
        const salt = generateSalt()
        const hashed = hashWithSalt(fieldValue, salt)

        ctx.params = {
          ...ctx.params,
          [fieldName]: hashed,
          [fieldName + 'Salt']: salt
        }

        return ctx
      }

    },

    throwWhenFieldExists(fieldName) {
      return (ctx) => {
        const fieldValue = ctx.params[fieldName]

        if (!fieldValue) {
          throw new Error(`No "${fieldName}" passed. Cant check if exists!`)
        }

        return this.actions.count({
          query: {
            [fieldName]: fieldValue
          },
        }).then(resultsCount => {
          if (resultsCount > 0) {
            throw new Error(`Entry with field "${fieldName}" with value "${fieldValue}" already exists!`)
          }
        })
      }
    },

    privilegeChecker(ctx) {
      this.logger.info('Asked to check privileges')

      if (!ctx.meta.calledByApi) {
        this.logger.info('Not called by API. Skipping!')

        return
      }

      const requiredPrivileges = this.settings && this.settings.requiredPrivileges

      if (!requiredPrivileges) {
        this.logger.info('Not requiredPrivileges in service settings. Skipping!')

        return
      }

      const actionName = ctx.action && ctx.action.rawName

      if (!actionName) {
        this.logger.info('Not action name in ctx. Skipping!')

        return
      }

      const privilegesToCheck = requiredPrivileges[actionName]

      if (!privilegesToCheck) {
        this.logger.info(`No privileges specified for ${actionName} action. Skipping!`)

        return
      }

      if (!Array.isArray(privilegesToCheck)) {
        // eslint-disable-next-line max-len
        const message = `Privileges to check (from service settings) should be an array!Found ${typeof privilegesToCheck} instead.`
        this.logger.error(message)
        throw new MoleculerError(message)
      }

      if (privilegesToCheck.length === 0) {
        this.logger.info(`Empty array of privileges specified for ${actionName} action. Skipping!`)

        return
      }

      const privilegesFromToken = (
        ctx.meta &&
        ctx.meta.decodedToken &&
        ctx.meta.decodedToken.privileges
      ) || []

      if (!Array.isArray(privilegesFromToken)) {
        const message = `Privileges in token should be an array! Found ${typeof privilegesToCheck} instead.`
        this.logger.error(message)
        throw new MoleculerError(message)
      }

      const additionalPrivileges = ctx.meta.decodedToken ? ['$ALL_AUTHENTICATED'] : []

      const systemPrivileges = ctx.meta.privileges || []

      const allPrivileges = additionalPrivileges.concat(systemPrivileges).concat(privilegesFromToken)

      const matchedPrivileges = privilegesToCheck.filter(
        privilegeToCheck => allPrivileges.includes(privilegeToCheck)
      )

      if (matchedPrivileges.length === 0) {
        // eslint-disable-next-line max-len
        const message = `User does not have required privileges for that action! Missing privileges: ${privilegesToCheck.join(', ')}.`
        this.logger.error(message)
        throw new PrivilegesError(message)
      }

      this.logger.info('Privileges check passed!')

    },

    singletonService(ctx) {

      const isSingleton = this.settings && this.settings.singleton
      if (!isSingleton) return

      const actionName = ctx.action.rawName
      const serviceName = ctx.service.name

      switch (actionName) {
        case 'create':
          return this.broker.call(`${serviceName}.count`)
            .then(count => {
              if (count === 0) return ctx

              throw new SingletonDataOverflow()
            })
        case 'find':
          // normal behavior
          break
        case 'list':
          // normal behavior
          break
        case 'count':
          // normal behavior
          break
        case 'update':
          if (ctx.meta.calledByApi) {
            throw new WebErrors.BadRequestError('Method not allowed!')
          }
          break
        case 'insert':
          throw new WebErrors.BadRequestError('Method not allowed!')
        case 'get':
          throw new WebErrors.BadRequestError('Method not allowed!')
        case 'remove':
          throw new WebErrors.BadRequestError('Method not allowed!')
        default:
          throw new WebErrors.BadRequestError('Method not allowed!')
      }

    },

    singletonOverflowErrorCatcher(ctx, err) {
      if (err instanceof SingletonDataOverflow) {
        const serviceName = ctx.service.name
        this.logger.info(`Error occurred when '${ctx.action.name}' action was called`)
        this.logger.info(`Error type ${err.type} was thrown. Handling it by overwrite data in exiting record!`)

        return this.broker.call(`${serviceName}.find`)
          .then(data => data[0]._id)
          .then(recordId => this.broker.call(`${serviceName}.update`, { id: recordId, ...ctx.params }))
      }

      throw err
    },

    createLookupFromService(serviceName, valueFieldName = 'name', keyFieldName = '_id') {
      return this.broker.call(`${serviceName}.find`, {}, { meta: { raw: true } })
        .then((items) => (
          items.reduce(
            (r, item) => ({
              ...r,
              [getValuesFromItem(keyFieldName, item)]: getValuesFromItem(valueFieldName, item)
            }),
            {}
          )
        ))
    },

    createOptionsFromService(serviceName, labelFieldName = 'name', valueFieldName = '_id') {
      return this.broker.call(`${serviceName}.find`, {}, { meta: { raw: true } })
        .then((items) => (
          items.map((item) => ({
            label: getValuesFromItem(labelFieldName, item),
            value: getValuesFromItem(valueFieldName, item),
          }))
        ))
    },

    async itemPrivilegesChecker(ctx) {
      if (!this.settings.itemPrivileges) return ctx

      if (
        !Array.isArray(this.settings.itemPrivileges) ||
        this.settings.itemPrivileges.length === 0
      ) {
        this.logger.warn('Service has empty or invalid itemPrivileges! Cant filter!')
        return ctx
      }

      this.logger.info('Asked to filter by item privileges')

      const actionName = ctx.action.rawName

      const checkPromises = this.settings.itemPrivileges.map(
        async ({ privileges, tokenPath, itemPath, queryByPopulation }) => {
          const decodedToken = (
            ctx.meta &&
            ctx.meta.decodedToken
          )
          const privilegesFromToken = (
            decodedToken &&
            ctx.meta.decodedToken.privileges
          ) || []

          // if user do not have certain privileges that causes filter, then skip
          if (!privileges.find(privilege => privilegesFromToken.includes(privilege))) return

          const addSearchParams = () => {
            // modify ctx from outer scope
            ctx.params = ctx.params || {}
            ctx.params.query = ctx.params.query || {}

            const queryToAdd = { [itemPath]: _.get(decodedToken, tokenPath) }

            this.logger.info(`Added ${JSON.stringify(queryToAdd)} to filter query!`)

            const populate = (
              queryByPopulation ?
                Object.keys(this.settings.populates || {})
                :
                undefined
            )

            ctx.params = {
              ...ctx.params,
              queryByPopulation,
              populate,
              query: {
                ...ctx.params.query,
                ...queryToAdd,
              }
            }
          }

          const getItemThenCheckIfFilterAllows = async () => {
            const id = ctx.params.id
            const serviceName = ctx.action.name.split('.')[0]

            const populate = (
              queryByPopulation ?
                Object.keys(this.settings.populates || {})
                :
                undefined
            )

            const item = await this.broker.call(`${serviceName}.get`, { id, populate })

            if (_.get(item, itemPath) !== _.get(decodedToken, tokenPath)) {
              const message = `User cant perform that action! Fail on filter rule for ${privileges.join(', ')}!`
              this.logger.error(message)
              throw new PrivilegesError(message)
            }

            // add params populate to original call
            if (actionName === 'get' && queryByPopulation) {
              ctx.params = {
                ...ctx.params,
                populate,
              }
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
              await getItemThenCheckIfFilterAllows()
              break
            case 'update':
              await getItemThenCheckIfFilterAllows()
              break
            case 'remove':
              await getItemThenCheckIfFilterAllows()
              break
            case 'insert':
              // here is nothing to check - user is creating new
              break
            case 'create':
              // here is nothing to check - user is creating new
              break
          }
        }
      )

      return Promise.all(checkPromises)
        .then(() => ctx)
    },

    queryByPopulation(ctx) {
      const actionName = ctx.action.rawName

      const checkIfIsQueryByPopulationParamSet = () => {
        const { queryByPopulation } = ctx.params

        if (queryByPopulation) throw new QueryByPopulationValues()
      }

      switch (actionName) {
        case 'find':
          checkIfIsQueryByPopulationParamSet()
          break
        case 'list':
          checkIfIsQueryByPopulationParamSet()
          break
        case 'count':
          checkIfIsQueryByPopulationParamSet()
          break
        case 'get':
          // normal behaviour
          break
        case 'update':
          // normal behaviour
          break
        case 'remove':
          // normal behaviour
          break
        case 'insert':
          // normal behaviour
          break
        case 'create':
          // normal behaviour
          break
      }

      return ctx
    },

    async queryByPopulationValuesErrorCatcher(ctx, err) {
      if (!(err instanceof QueryByPopulationValues)) throw err

      this.logger.info(`Error occurred when '${ctx.action.name}' action was called`)
      this.logger.info(`Error type ${err.type} was thrown. Handling it by running queryByPopulation!`)

      const actionName = ctx.action.rawName
      const serviceName = ctx.action.name.split('.')[0]
      const populateFields = ctx.params.populate || []

      const queryWithoutPopulationFields = _.pickBy(
        ctx.params.query || {},
        (value, key) => !(populateFields.includes(key.split('.')[0]))
      )
      const queryWithOnlyPopulationFields = _.pickBy(
        ctx.params.query || {},
        (value, key) => populateFields.includes(key.split('.')[0])
      )

      const findAllParams = { ...ctx.params, query: queryWithoutPopulationFields }
      delete findAllParams.queryByPopulation

      const allResults = await this.broker.call(`${serviceName}.find`, findAllParams)

      const filteredByQueryResults = allResults.filter(sift(queryWithOnlyPopulationFields))
      const countTotal = filteredByQueryResults.length

      const { page = 1, pageSize = 10 } = ctx.params

      switch (actionName) {
        case 'find':
          return filteredByQueryResults
        case 'count':
          return countTotal
        case 'list':
          return {
            rows: filteredByQueryResults.filter(filterByPage(page, pageSize)),
            total: countTotal,
            page: page,
            pageSize: pageSize,
            totalPages: Math.floor((countTotal + pageSize - 1) / pageSize)
          }
      }
    },

  },
}