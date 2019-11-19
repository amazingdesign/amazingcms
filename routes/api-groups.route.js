module.exports = {
  authorization: true,
  path: '/api/groups',
  aliases: {
    'REST /': 'groups',
    'GET :id': 'groups.get',
  },
  whitelist: [
    'groups.list',
    'groups.find',
    'groups.get',
    'groups.create',
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