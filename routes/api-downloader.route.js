module.exports = {
  authorization: false,
  path: '/api/downloader',
  aliases: {
    'GET /:bucketName?/:id': 'downloader.get',
  },
  whitelist: [
    'downloader.get',
  ],
  callOptions: {
    meta: {
      calledByApi: true,
    }
  },
  onBeforeCall(ctx, route, req, res) {
    // Set request headers to context meta
    ctx.meta.headers = req.headers
  },
  mappingPolicy: 'restrict',
}