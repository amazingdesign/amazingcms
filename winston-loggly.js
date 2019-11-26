const { extend } = require('moleculer').Logger
const winston = require('winston')
const moment = require('moment')
const chalk = require('chalk')
const _ = require('lodash')

const { getConfig } = require('@bit/amazingdesign.utils.config')

const LOGGER_HTTP_HOST = getConfig('LOGGER_HTTP_HOST')
const LOGGER_HTTP_PORT = getConfig('LOGGER_HTTP_PORT')
const LOGGER_HTTP_PATH = getConfig('LOGGER_HTTP_PATH')

const logger = bindings => extend(winston.createLogger({
  format: winston.format.combine(
    winston.format.label({ label: bindings }),
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, label, timestamp }) => {
          const getColor = type => {
            switch (type) {
              case 'fatal': return chalk.red.inverse
              case 'error': return chalk.red
              case 'warn': return chalk.yellow
              case 'debug': return chalk.magenta
              case 'trace': return chalk.gray
              default: return chalk.green
            }
          }
          const getType = type => getColor(type)(_.padEnd(type.toUpperCase(), 5))

          const time = chalk.grey(`[${moment(timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')}]`)

          return `${time} ${getType(level)} ${chalk.grey(label.mod)} :\n${message}`
        }),
      )
    }),
  ].concat(
    (
      LOGGER_HTTP_HOST &&
      new winston.transports.Http({
        host: LOGGER_HTTP_HOST,
        port: LOGGER_HTTP_PORT || 80,
        path: LOGGER_HTTP_PATH || '/',
      })
    ) || []
  )
}))

module.exports = logger