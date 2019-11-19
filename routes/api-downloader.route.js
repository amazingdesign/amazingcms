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
  mappingPolicy: 'restrict',
}