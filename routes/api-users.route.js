module.exports = {
  authorization: true,
  path: '/api/users',
  aliases: {
    'REST /': 'users',
    'GET :id': 'users.get',
  },
  whitelist: [
    'users.list',
    'users.find',
    'users.get',
    'users.create',
    'users.remove',
    'users.update',
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