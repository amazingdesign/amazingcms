module.exports = {
  authorization: true,
  path: '/api/payments',
  aliases: {
    'GET /:orderId': 'payments.create',
    'POST /verify': 'payments.verify',
  },
  whitelist: [
    'payments.create',
    'payments.verify',
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
    ctx.meta.clientIp = (
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress
    )
  },
}