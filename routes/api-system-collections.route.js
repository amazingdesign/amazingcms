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
    json: true,
    urlencoded: { extended: true }
  },
  callOptions: {
    meta: {
      calledByApi: true,
    }
  }
}