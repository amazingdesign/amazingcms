module.exports = {
  authorization: true,
  path: '/api/mux',
  aliases: {
    'REST /': 'mux',
    'GET :id': 'mux.get',
    'POST /upload-url': 'mux.createUploadUrl',
    'POST /webhooks': 'mux.webhooks',
    'GET /token/:id': 'mux.token',
  },
  whitelist: [
    'mux.list',
    'mux.find',
    'mux.get',
    'mux.create',
    'mux.update',
    'mux.createUploadUrl',
    'mux.webhooks',
    'mux.token',
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
  mappingPolicy: 'restrict',
}