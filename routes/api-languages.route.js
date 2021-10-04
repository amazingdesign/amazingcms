module.exports = {
  authorization: true,
  path: '/api/languages',
  aliases: {
    'REST /': 'languages',
    'GET :id': 'languages.get',
  },
  whitelist: [
    'languages.list',
    'languages.get',
    'languages.create',
    'languages.update',
    'languages.remove',
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