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
    json: true,
    urlencoded: { extended: true }
  },
  callOptions: {
    meta: {
      calledByApi: true,
    }
  }
}