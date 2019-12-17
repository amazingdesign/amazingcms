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
    json: true,
    urlencoded: { extended: true }
  },
  callOptions: {
    meta: {
      calledByApi: true,
    }
  }
}