module.exports = {
  authorization: true,
  path: '/api/uploader',
  aliases: {
    'POST /:bucketName?': {
      type: 'multipart',
      busboyConfig: {
        limits: { files: 10 }
      },
      action: 'uploader.create'
    },
    'GET /:bucketName/:id': 'uploader.getProxy',
    'GET /:bucketName?': 'uploader.listProxy',
    'DELETE /:bucketName?/:id': 'uploader.removeProxy',
  },
  whitelist: [
    'uploader.create',
    'uploader.getProxy',
    'uploader.listProxy',
    'uploader.removeProxy',
  ],
  bodyParsers: {
    json: false,
    urlencoded: false
  },
  // eslint-disable-next-line max-params
  onBeforeCall(ctx, route, req, res, data) {
    ctx.meta.bucketName = req.$params.bucketName
    
    return ctx
  },
  callOptions: {
    meta: {
      calledByApi: true,
    }
  },
  mappingPolicy: 'restrict',
}