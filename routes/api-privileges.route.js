module.exports = {
  authorization: true,
  path: '/api/privileges',
  aliases: {
    'REST /': 'privileges',
    'GET :id': 'privileges.get',
  },
  whitelist: [
    'privileges.*',
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