module.exports = {
  authorization: true,
  path: '/api/orders',
  aliases: {
    'REST /': 'orders',
    'GET :id': 'orders.get',
  },
  whitelist: [
    'orders.list',
    'orders.find',
    'orders.get',
    'orders.create',
    'orders.update',
  ],
  bodyParsers: {
    json: { limit: '5MB' },
    urlencoded: { extended: true, limit: '5MB' }
  },
  callOptions: {
    meta: {
      calledByApi: true,
    }
  }
}