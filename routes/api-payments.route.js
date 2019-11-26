module.exports = {
  authorization: true,
  path: '/api/payments',
  aliases: {
    'POST /verify': 'payments.verify',
  },
  whitelist: [
    'payments.verify',
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
  onBeforeCall(ctx, route, req, res) {
    ctx.meta.clientIp = (
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress
    )
  },
}