module.exports = {
  authorization: true,
  path: '/api/system-collections',
  aliases: {
    'GET /': 'system-collections.get',
  },
  whitelist: [
    'system-collections.get',
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