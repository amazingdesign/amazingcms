const jwt = require('jsonwebtoken')

const hashWithSalt = require('@bit/amazingdesign.utils.hash-with-salt')

const { ServiceBroker } = require('moleculer')
const AuthService = require('../../services/auth.service')

describe('Test "auth" service', () => {

  describe('token generating', () => {
    const TEST_ACCESS_TOKEN_EXPIRES_IN = '15m'
    const TEST_SECRET = 'secret'
    const TEST_USER_FIELDS_IN_PAYLOAD = 'email,firstName'
    const TEST_USER = {
      email: 'example@example.com',
      firstName: 'Ala',
      lastName: 'Kotowicz',
      password: 'hashedPass',
      passwordSalt: 'salt',
    }

    beforeEach(() => {
      process.env.SECRET = TEST_SECRET
      process.env.USER_FIELDS_IN_PAYLOAD = TEST_USER_FIELDS_IN_PAYLOAD
      process.env.ACCESS_TOKEN_EXPIRES_IN = TEST_ACCESS_TOKEN_EXPIRES_IN
    })
    afterEach(() => {
      delete process.env.SECRET
      delete process.env.USER_FIELDS_IN_PAYLOAD
      delete process.env.ACCESS_TOKEN_EXPIRES_IN
    })

    it('throws on wrong secret', () => {
      process.env.SECRET += 'wrong-end'

      return AuthService.methods.generateAccessToken(TEST_USER)
        .then(token => {
          expect(() => jwt.verify(token, TEST_SECRET)).toThrow()
        })
    })

    it('generate valid token without payload', () => {
      return AuthService.methods.generateAccessToken(TEST_USER)
        .then(token => {
          expect(() => jwt.verify(token, TEST_SECRET)).not.toThrow()
          expect(jwt.verify(token, TEST_SECRET)).not.toEqual(expect.objectContaining(TEST_USER))
        })
    })

    it('generate valid token with payload', () => {
      const expectedPayload = TEST_USER_FIELDS_IN_PAYLOAD
        .split(',')
        .reduce((r, key) => ({ ...r, [key]: expect.anything() }), {})

      return AuthService.methods.generateAccessToken(TEST_USER)
        .then(token => {
          expect(() => jwt.verify(token, TEST_SECRET)).not.toThrow()
          expect(jwt.verify(token, TEST_SECRET)).not.toEqual(expect.objectContaining(TEST_USER))
          expect(jwt.verify(token, TEST_SECRET)).toEqual(expect.objectContaining(expectedPayload))
        })
    })

  })

  describe('refresh token generating', () => {
    const TEST_REFRESH_TOKEN_EXPIRES_IN = '15days'
    const TEST_REFRESH_SECRET = 'secret'
    const TEST_USER = {
      email: 'example@example.com',
      firstName: 'Ala',
      lastName: 'Kotowicz',
      password: 'hashedPass',
      passwordSalt: 'salt',
      refreshTokenSalt: 'salt2',
    }

    beforeEach(() => {
      process.env.REFRESH_SECRET = TEST_REFRESH_SECRET
      process.env.REFRESH_TOKEN_EXPIRES_IN = TEST_REFRESH_TOKEN_EXPIRES_IN
    })
    afterEach(() => {
      delete process.env.REFRESH_SECRET
      delete process.env.REFRESH_TOKEN_EXPIRES_IN
    })

    it('throws on wrong secret', () => {
      process.env.REFRESH_SECRET += 'wrong-end'

      return AuthService.methods.generateRefreshToken(TEST_USER)
        .then(token => {
          expect(() => jwt.verify(token, TEST_REFRESH_SECRET)).toThrow()
        })
    })

    it('passes with right user secret', () => {
      const { password, passwordSalt, refreshTokenSalt } = TEST_USER
      const TEST_USER_REFRESH_SECRET = password + passwordSalt + TEST_REFRESH_SECRET + refreshTokenSalt

      return AuthService.methods.generateRefreshToken(TEST_USER)
        .then(token => {
          expect(() => jwt.verify(token, TEST_USER_REFRESH_SECRET)).not.toThrow()
        })
    })

    it('fails when user pass changes', () => {
      const { password, passwordSalt, refreshTokenSalt } = TEST_USER
      const TEST_USER_REFRESH_SECRET = password + passwordSalt + TEST_REFRESH_SECRET + refreshTokenSalt

      const CHANGED_TEST_USER = {
        ...TEST_USER,
        password: 'PASS_HASHED',
        passwordSalt: 'SALT'
      }

      return AuthService.methods.generateRefreshToken(CHANGED_TEST_USER)
        .then(token => {
          expect(() => jwt.verify(token, TEST_USER_REFRESH_SECRET)).toThrow()
        })
    })

    it('fails when refresh salt changes', () => {
      const { password, passwordSalt, refreshTokenSalt } = TEST_USER
      const TEST_USER_REFRESH_SECRET = password + passwordSalt + TEST_REFRESH_SECRET + refreshTokenSalt

      const CHANGED_TEST_USER = {
        ...TEST_USER,
        refreshTokenSalt: 'SALT'
      }

      return AuthService.methods.generateRefreshToken(CHANGED_TEST_USER)
        .then(token => {
          expect(() => jwt.verify(token, TEST_USER_REFRESH_SECRET)).toThrow()
        })
    })
  })

  describe('logging in', () => {
    const TEST_ACCESS_TOKEN_EXPIRES_IN = '5m'
    const TEST_REFRESH_TOKEN_EXPIRES_IN = '15days'
    const TEST_USER_FIELDS_IN_PAYLOAD = 'email,firstName'
    const TEST_REFRESH_SECRET = 'refresh-secret'
    const TEST_SECRET = 'secret'
    const TEST_USER_PASSWORD = 'secret-password'
    const TEST_USER_PASSWORD_SALT = 'salt'
    const TEST_USER_EMAIL = 'example@example.com'
    const TEST_USER = {
      email: TEST_USER_EMAIL,
      firstName: 'Ala',
      lastName: 'Kotowicz',
      password: hashWithSalt(TEST_USER_PASSWORD, TEST_USER_PASSWORD_SALT),
      passwordSalt: TEST_USER_PASSWORD_SALT,
    }
    const UsersServiceMock = {
      name: 'users',
      actions: {
        find: () => [TEST_USER]
      }
    }

    const broker = new ServiceBroker({ logger: false })
    broker.createService(AuthService)
    broker.createService(UsersServiceMock)

    beforeAll(() => broker.start())
    afterAll(() => broker.stop())

    beforeEach(() => {
      process.env.SECRET = TEST_SECRET
      process.env.USER_FIELDS_IN_PAYLOAD = TEST_USER_FIELDS_IN_PAYLOAD
      process.env.ACCESS_TOKEN_EXPIRES_IN = TEST_ACCESS_TOKEN_EXPIRES_IN
      process.env.REFRESH_TOKEN_EXPIRES_IN = TEST_REFRESH_TOKEN_EXPIRES_IN
      process.env.REFRESH_SECRET = TEST_REFRESH_SECRET
    })
    afterEach(() => {
      delete process.env.SECRET
      delete process.env.USER_FIELDS_IN_PAYLOAD
      delete process.env.ACCESS_TOKEN_EXPIRES_IN
      delete process.env.REFRESH_TOKEN_EXPIRES_IN
      delete process.env.REFRESH_SECRET
    })

    it('logs user in with valid credentials', () => {
      return broker.call('auth.logIn', { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD })
        .then(async (response) => {
          expect(response).toEqual(expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }))
          expect(response).toEqual(expect.objectContaining({
            accessToken: await AuthService.methods.generateAccessToken(TEST_USER),
            refreshToken: await AuthService.methods.generateRefreshToken(TEST_USER),
          }))
        })
    })
  })

  describe('remind password', () => {
    const VALID_USER = {
      _id: 'valid-valid-valid',
      email: 'valid@example.com',
    }
    const INVALID_USER = {
      _id: 'invalid-invalid-invalid',
      email: 'invalid@example.com',
    }
    const TEST_SECRET = 'password-reset-secret'
    const TEST_EXPIRES_IN = '15s'
    const PASSWORD_RESET_EMAIL_SUBJECT = 'Password renewal request!'
    const PASSWORD_RESET_EMAIL_CONTENT = 'This is the link to renew hour password {{token}}!'

    const MockMailer = {
      name: 'mailer',
      actions: {
        send: jest.fn(),
      }
    }
    const MockUsers = {
      name: 'users',
      actions: {
        update: jest.fn(),
        find: (ctx) => {
          const { query: { email } } = ctx.params

          if (email === VALID_USER.email) {
            return Promise.resolve([VALID_USER])
          }

          return Promise.resolve([])
        }
      }
    }

    const broker = new ServiceBroker({ logger: false })
    broker.createService(AuthService)
    broker.createService(MockMailer)
    broker.createService(MockUsers)

    beforeAll(() => {
      process.env.PASSWORD_RESET_EMAIL_SUBJECT = PASSWORD_RESET_EMAIL_SUBJECT
      process.env.PASSWORD_RESET_EMAIL_CONTENT = PASSWORD_RESET_EMAIL_CONTENT
      process.env.PASSWORD_RESET_SECRET = TEST_SECRET
      process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN = TEST_EXPIRES_IN
      return broker.start()
    })
    afterAll(() => {
      delete process.env.PASSWORD_RESET_SECRET
      delete process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN
      delete process.env.PASSWORD_RESET_EMAIL_SUBJECT
      delete process.env.PASSWORD_RESET_EMAIL_CONTENT
      return broker.stop()
    })

    it('should fail without email address', () => {
      expect.assertions(1)

      return expect(
        broker.call('auth.sendForgotPasswordEmail')
      ).rejects.toThrow(new Error('E-mail not found in body!'))
    })

    it('should fail with invalid email address', () => {
      expect.assertions(1)

      return expect(
        broker.call('auth.sendForgotPasswordEmail', { email: INVALID_USER.email })
      ).rejects.toThrow(new Error('User not found!'))
    })

    it('should call mailer.send after request', () => {
      expect.assertions(1)

      return broker.call('auth.sendForgotPasswordEmail', { email: VALID_USER.email })
        .then(() => expect(MockMailer.actions.send).toBeCalledTimes(1))
    })

    it('should call users.update after resetPassword request with valid token', () => {
      expect.assertions(1)

      const payload = { userId: VALID_USER.userId }
      const options = { expiresIn: TEST_EXPIRES_IN }
      const passwordResetToken = jwt.sign(payload, TEST_SECRET, options)

      return broker.call('auth.resetPassword', { passwordResetToken, password: 'new-password' })
        .then(() => expect(MockUsers.actions.update).toBeCalledTimes(1))
    })
  })
})
