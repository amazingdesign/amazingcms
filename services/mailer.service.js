'use strict'

const { getConfigOrFail } = require('@bit/amazingdesign.utils.config')
const MailerService = require('moleculer-mail')

const SMTP_PORT = getConfigOrFail('SMTP_PORT')
const SMTP_HOST = getConfigOrFail('SMTP_HOST')
const SMTP_USER = getConfigOrFail('SMTP_USER')
const SMTP_PASSWORD = getConfigOrFail('SMTP_PASSWORD')
const FROM_EMAIL = getConfigOrFail('FROM_EMAIL')

module.exports = {
  name: 'mailer',
  mixins: [MailerService],
  settings: {
    from: FROM_EMAIL,
    transport: {
      port: Number(SMTP_PORT),
      host: SMTP_HOST,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      }
    }
  },

}