module.exports = {
  authorization: true,
  path: '/api/events-log',
  aliases: {
    'GET /': 'events-log.list',
    'GET :id': 'events-log.get',
  },
  whitelist: [
    'events-log.list',
    'events-log.get',
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