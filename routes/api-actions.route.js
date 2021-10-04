module.exports = {
  authorization: true,
  path: '/api/actions',
  aliases: {
    'REST /:collectionName': 'actions',
    'REST /:collectionName/:languageCode': 'actions'
  },
  whitelist: [
    'actions.*',
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
    ctx.meta.collectionName = req.$params.collectionName
    ctx.meta.language = req.$params.language
  },
}