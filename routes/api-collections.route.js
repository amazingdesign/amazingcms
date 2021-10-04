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
    json: { limit: '5MB' },
    urlencoded: { extended: true, limit: '5MB' }
  },
  callOptions: {
    meta: {
      calledByApi: true,
    }
  },
  onBeforeCall(ctx, route, req, res) {
    ctx.meta.raw = req.$params.raw
  },
}