/* eslint-disable max-lines */
'use strict'
const generateSalt = require('@bit/amazingdesign.utils.generate-salt')
const hashWithSalt = require('@bit/amazingdesign.utils.hash-with-salt')

const { MoleculerError } = require('moleculer').Errors
const { PrivilegesError, SingletonDataOverflow } = require('./db-utils.errors')
const { Errors: WebErrors } = require('moleculer-web')

module.exports = {
  hooks: {
    before: {
      '*': ['singletonService', 'privilegeChecker']
    },
    error: {
      '*': 'singletonOverflowErrorCatcher'
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
      return this.broker.call(`${serviceName}.find`)
        .then((items) => (
          items.reduce(
            (r, item) => ({ ...r, [item[keyFieldName]]: item[valueFieldName] }),
            {}
          )
        ))
    },

    createOptionsFromService(serviceName, labelFieldName = 'name', valueFieldName = '_id') {
      return this.broker.call(`${serviceName}.find`)
        .then((items) => (
          items.map((item) => ({ label: item[labelFieldName], value: item[valueFieldName] }))
        ))
    },

  },
}