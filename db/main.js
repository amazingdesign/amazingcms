const DbService = require('moleculer-db')
const MongoDBAdapter = require('moleculer-db-adapter-mongo')

const { getConfig, getConfigOrFail } = require('@bit/amazingdesign.utils.config')

if (getConfig('TEST')) {
  module.exports = DbService
} else {
  const mongoDbAddress = getConfigOrFail('MONGODB_ADDRESS')

  module.exports = {
    mixins: [DbService],
    adapter: new MongoDBAdapter(mongoDbAddress),
  }
}
