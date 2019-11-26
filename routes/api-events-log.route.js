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
    json: true,
    urlencoded: { extended: true }
  },
  callOptions: {
    meta: {
      calledByApi: true,
    }
  }
}