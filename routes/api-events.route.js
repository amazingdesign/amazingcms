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
    json: true,
    urlencoded: { extended: true }
  },
  callOptions: {
    meta: {
      calledByApi: true,
    }
  }
}