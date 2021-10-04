module.exports = {
  authorization: true,
  path: '/api/events',
  aliases: {
    'REST /': 'events',
    'GET :id': 'events.get',
  },
  whitelist: [
    'events.list',
    'events.get',
    'events.create',
    'events.update',
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