module.exports = {
  authorization: true,
  path: '/api/privileges',
  aliases: {
    'REST /': 'privileges',
    'GET :id': 'privileges.get',
  },
  whitelist: [
    'privileges.list',
    'privileges.find',
    'privileges.get',
    'privileges.create',
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