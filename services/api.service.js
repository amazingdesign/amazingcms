'use strict'

const ApiGateway = require('moleculer-web')
const AuthorizationMixin = require('@bit/amazingdesign.moleculer.authorizationmixin')

const fs = require('fs')
const path = require('path')
const normalizedPath = path.resolve('routes')
const routes = fs.readdirSync(normalizedPath).map((file) => require('../routes/' + file))

module.exports = {
  name: 'api',
  mixins: [
    ApiGateway,
    AuthorizationMixin,
  ],

  settings: {
    port: process.env.PORT || 3000,
    cors: {
      origin: '*',
    },
    assets: {
      folder: 'public'
    },
    routes: routes,
  }
}