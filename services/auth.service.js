/* eslint-disable max-lines */
'use strict'

const jwt = require('jsonwebtoken')
const _ = require('lodash')
const { Errors: WebErrors } = require('moleculer-web')

const { getConfigOrFail } = require('@bit/amazingdesign.utils.config')
const hashWithSalt = require('@bit/amazingdesign.utils.hash-with-salt')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')

module.exports = {
  name: 'auth',

  mixins: [EventDispatcherMixin],

  actions: {
    register(ctx) {
      return ctx.call('users.create', ctx.params)
    },
    logIn(ctx) {
      const { email, password } = ctx.params

      if (!email) {
        return Promise.reject(new Error('E-mail not found in body!'))
      }
      if (!password) {
        return Promise.reject(new Error('Password not found in body!'))
      }

      return ctx.call(
        'users.find',
        { populate: ['groups'], query: { email } },
        // @FIXME I must overwrite calledByApi to access user protected fields etc
        { meta: { calledByApi: false } }
      )
        .then((results) => {
          const [user] = results

          if (!user) {
            return Promise.reject(new Error('User not found!'))
          }

          const isPasswordValid = this.checkPasswordMatch(user, password)

          if (!isPasswordValid) {
            return Promise.reject(new Error('Invalid password'))
          }

          return this.generateTokensPair(user)
        })
        .catch((err) => {
          return Promise.reject(err)
        })
    },
    refreshToken(ctx) {
      const { refreshToken } = ctx.params

      if (!refreshToken) {
        return Promise.reject(new Error('refreshToken not found in body!'))
      }

      return this.verifyRefreshToken(refreshToken)
        .then(user => {
          return this.generateTokensPair(user)
        })
        .catch(err => {
          if (err instanceof jwt.JsonWebTokenError) {
            return this.Promise.reject(new WebErrors.UnAuthorizedError(err.message))
          }

          return this.Promise.reject(err)
        })
    },
    sendForgotPasswordEmail(ctx) {
      const { email } = ctx.params

      if (!email) {
        return Promise.reject(new Error('E-mail not found in body!'))
      }

      return ctx.call('users.find', { query: { email } })
        .then((results) => {
          const [user] = results

          if (!user) {
            return Promise.reject(new Error('User not found!'))
          }

          return user
        })
        .then((user) => (
          this.generatePasswordResetToken(user)
            .then((passwordResetToken) => ({ passwordResetToken, user })))
        )
        .then(({ passwordResetToken, user }) => {
          const params = {
            to: user.email,
            subject: getConfigOrFail('PASSWORD_RESET_EMAIL_SUBJECT'),
            html: getConfigOrFail('PASSWORD_RESET_EMAIL_CONTENT').replace('{{token}}', passwordResetToken)
          }
          return this.broker.call('mailer.send', params)
        })
        .catch((err) => {
          return Promise.reject(err)
        })

    },
    resetPassword(ctx) {
      const { passwordResetToken, password } = ctx.params

      return this.verifyPasswordResetToken(passwordResetToken)
        .then((decodedToken) => {
          const { userId } = decodedToken

          return userId
        })
        .then((userId) => (
          this.broker.call(
            'users.update',
            { id: userId, password },
            // @FIXME act as superadmin to skip privileges
            // it should be better way to force privileges skipped
            { meta: { ...ctx.meta, decodedToken: { privileges: ['superadmin'] } } }
          )
        ))
    }
  },

  methods: {
    checkPasswordMatch(user, password) {
      const { password: hashedPassword, passwordSalt } = user

      this.logger.info(user)

      const isPasswordValid = hashedPassword === hashWithSalt(password, passwordSalt)

      return isPasswordValid
    },
    generateAccessToken(user) {
      const secret = getConfigOrFail('SECRET')
      let userFieldsInPayload = null

      const privileges = (
        user.groups &&
        user.groups.flatMap &&
        user.groups
          .flatMap(group => (group.privileges))
          .flatMap(privileges => privileges.name)
      )

      try {
        const userFieldsInPayloadString = getConfigOrFail('USER_FIELDS_IN_PAYLOAD')

        userFieldsInPayload = userFieldsInPayloadString.split(',')
      } catch (error) {
        userFieldsInPayload = []
      }

      const payload = {
        ..._.pick(user, userFieldsInPayload),
        privileges,
      }

      const options = {
        expiresIn: getConfigOrFail('ACCESS_TOKEN_EXPIRES_IN')
      }

      return new Promise((resolve, reject) => {
        jwt.sign(payload, secret, options, (err, token) => {
          if (err) reject(err)

          resolve(token)
        })
      })
    },
    generateRefreshToken(user) {
      const refreshSecret = getConfigOrFail('REFRESH_SECRET')

      const { password, passwordSalt, refreshTokenSalt, _id: userId } = user

      const userRefreshSecret = password + passwordSalt + refreshSecret + refreshTokenSalt

      const options = {
        expiresIn: getConfigOrFail('REFRESH_TOKEN_EXPIRES_IN')
      }

      return new Promise((resolve, reject) => {
        jwt.sign({ userId }, userRefreshSecret, options, (err, token) => {
          if (err) reject(err)

          resolve(token)
        })
      })
    },
    generateTokensPair(user) {
      return Promise.all([
        this.generateAccessToken(user),
        this.generateRefreshToken(user),
      ]).then(([accessToken, refreshToken]) => ({
        accessToken,
        refreshToken
      }))
    },
    verifyRefreshToken(refreshToken) {
      const decoded = jwt.decode(refreshToken)

      const { userId } = decoded

      if (!userId) return Promise.reject(new Error('No "userId" field in token payload!'))

      return this.broker.call('users.get', { populate: ['groups'], id: userId })
        .then((user) => {
          if (!user) return Promise.reject(new Error('No user find in database!'))

          const refreshSecret = getConfigOrFail('REFRESH_SECRET')

          const { password, passwordSalt, refreshTokenSalt } = user

          const userRefreshSecret = password + passwordSalt + refreshSecret + refreshTokenSalt

          const verifyPromise = new Promise((resolve, reject) => {
            jwt.verify(refreshToken, userRefreshSecret, (err, decoded) => {
              if (err) reject(err)

              resolve(user)
            })
          })

          return verifyPromise
        })
    },
    generatePasswordResetToken(user) {
      const secret = getConfigOrFail('PASSWORD_RESET_SECRET')

      const { _id: userId } = user

      const options = {
        expiresIn: getConfigOrFail('PASSWORD_RESET_TOKEN_EXPIRES_IN')
      }

      return new Promise((resolve, reject) => {
        jwt.sign({ userId }, secret, options, (err, token) => {
          if (err) reject(err)

          resolve(token)
        })
      })
    },
    verifyPasswordResetToken(passwordResetToken) {
      const secret = getConfigOrFail('PASSWORD_RESET_SECRET')

      const verifyPromise = new Promise((resolve, reject) => {
        jwt.verify(passwordResetToken, secret, (err, decoded) => {
          if (err) reject(err)

          resolve(decoded)
        })
      })

      return verifyPromise
    },
  }

}