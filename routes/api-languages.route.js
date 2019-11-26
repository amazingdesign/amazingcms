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
    json: true,
    urlencoded: { extended: true }
  },
  callOptions: {
    meta: {
      calledByApi: true,
    }
  }
}