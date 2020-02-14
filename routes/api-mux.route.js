module.exports = {
  authorization: true,
  path: '/api/mux',
  aliases: {
    'POST /upload-url': 'mux.createUploadUrl',
    'POST /webhooks': 'mux.webhooks',
    'REST /': 'mux',
    'GET :id': 'mux.get',
  },
  whitelist: [
    'mux.list',
    'mux.find',
    'mux.get',
    'mux.create',
    'mux.update',
    'mux.createUploadUrl',
    'mux.webhooks',
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