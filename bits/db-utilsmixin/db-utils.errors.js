const { MoleculerClientError } = require('moleculer').Errors

class PrivilegesError extends MoleculerClientError {
  constructor(message, type, data) {
    super(message, 403, type || 'PRIVILEGES_ERROR', data)
  }
}

class SingletonDataOverflow extends MoleculerClientError {
  constructor(message, type, data) {
    super(
      message || 'Attempted to create more than one record in singleton db service!',
      500, 
      type || 'SINGLETON_DATA_OVERFLOW',
      data
    )
  }
}

class QueryByPopulationValues extends MoleculerClientError {
  constructor(message, type, data) {
    super(
      message || 'Attempted to query by population values!',
      500, 
      type || 'QUERY_BY_POPULATION_VALUES',
      data
    )
  }
}

module.exports = {
  PrivilegesError,
  SingletonDataOverflow,
  QueryByPopulationValues,
}