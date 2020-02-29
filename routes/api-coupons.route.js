module.exports = {
  authorization: true,
  path: '/api/coupons',
  aliases: {
    'REST /': 'coupons',
    'GET :id': 'coupons.get',
  },
  whitelist: [
    'coupons.list',
    'coupons.find',
    'coupons.get',
    'coupons.create',
    'coupons.remove',
    'coupons.update',
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