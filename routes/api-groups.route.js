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
    'groups.update',
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