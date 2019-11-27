module.exports = {
  authorization: true,
  path: '/api',
  aliases: {
    'REST collections': 'collections',
    'PUT collections/:id': 'collections.update',
  },
  whitelist: [
    'collections.*',
  ],
  bodyParsers: {
    json: true,
    urlencoded: { extended: true }
  },
  callOptions: {
    meta: {
      calledByApi: true,
    }
  },
}