module.exports = {
  path: '/api/auth',
  aliases: {
    'POST register': 'auth.register',
    'POST logIn': 'auth.logIn',
    'POST refreshToken': 'auth.refreshToken',
    'POST sendForgotPasswordEmail': 'auth.sendForgotPasswordEmail',
    'POST resetPassword': 'auth.resetPassword',
  },
  whitelist: [
    'auth.register',
    'auth.logIn',
    'auth.refreshToken',
    'auth.sendForgotPasswordEmail',
    'auth.resetPassword',
  ],
  bodyParsers: {
    json: true,
    urlencoded: { extended: true }
  },
  callOptions: {
    meta: {
      calledByApi: true, 
    }
  }
}