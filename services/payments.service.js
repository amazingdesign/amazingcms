/* eslint-disable max-lines */
const crypto = require('crypto')
const qs = require('qs')

const { getConfigOrFail } = require('@bit/amazingdesign.utils.config')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')

const API_URL = getConfigOrFail('API_URL')
const PAYMENT_RETURN_URL_SUCCESS = getConfigOrFail('PAYMENT_RETURN_URL_SUCCESS')
const PAYMENT_RETURN_URL_FAILURE = getConfigOrFail('PAYMENT_RETURN_URL_FAILURE')
const PAYMENT_TITLE_DEFAULT = getConfigOrFail('PAYMENT_TITLE_DEFAULT')
const PAYMENT_SELLER_NAME_DEFAULT = getConfigOrFail('PAYMENT_SELLER_NAME_DEFAULT')
const PAYMENT_TPAY_SELLER_ID = getConfigOrFail('PAYMENT_TPAY_SELLER_ID')
const PAYMENT_TPAY_SECURITY_CODE = getConfigOrFail('PAYMENT_TPAY_SECURITY_CODE')

module.exports = {
  name: 'payments',

  mixins: [
    EventDispatcherMixin,
  ],

  hooks: {},

  settings: {
    paymentTittle: PAYMENT_TITLE_DEFAULT,
    returnURLSuccess: PAYMENT_RETURN_URL_SUCCESS,
    returnURLFailure: PAYMENT_RETURN_URL_FAILURE,
    responseURL: API_URL + '/api/payments/verify',
    sellerName: PAYMENT_SELLER_NAME_DEFAULT,
    defaultMethod: 'tpay',
  },

  actions: {
    async create(ctx) {
      const {
        orderId,
        method = this.settings.defaultMethod,
        customer,
        settings,
      } = ctx.params

      if (!orderId) throw Error('You must specify orderId!')

      const { orderTotal: amount, paymentSettings } = await this.broker.call('orders.get', { id: orderId })

      const mergedSettings = { ...this.settings, ...paymentSettings, ...settings }

      if (amount === 0) {
        await this.makeOrderPaid(orderId)

        return { redirectURL: mergedSettings.returnURLSuccess }
      }

      switch (method) {
        case 'tpay':
          return this.createPaymentByTpay(amount, orderId, mergedSettings, customer)
        default:
          return { redirectURL: mergedSettings.returnURLFailure }
      }

    },
    async verify(ctx) {
      const { response, orderId } = this.verifyPaymentByTpay(ctx)

      await this.makeOrderPaid(orderId)

      return response
    }
  },

  methods: {
    makeOrderPaid(orderId) {
      return this.broker.call('orders.update', { id: orderId, status: 'paid' })
    },
    calculateResponseMd5SumTpay(transactionId, amount, crc) {
      const sellerId = PAYMENT_TPAY_SELLER_ID
      const securityCode = PAYMENT_TPAY_SECURITY_CODE

      return crypto.createHash('md5').update(`${sellerId}${transactionId}${amount}${crc}${securityCode}`).digest('hex')
    },
    calculateRequestMd5SumTpay(amount, crc) {
      const sellerId = PAYMENT_TPAY_SELLER_ID
      const securityCode = PAYMENT_TPAY_SECURITY_CODE

      return crypto.createHash('md5').update(`${sellerId}${amount}${crc}${securityCode}`).digest('hex')
    },
    createPaymentByTpay(amount, orderId, settings, customer = {}) {
      const sellerId = PAYMENT_TPAY_SELLER_ID
      const url = 'https://secure.tpay.com'
      const crc = orderId
      const amountFixed = Number(amount).toFixed(2)
      const md5 = this.calculateRequestMd5SumTpay(amountFixed, crc)

      const data = {
        id: sellerId,
        amount: amountFixed,
        description: settings.paymentTittle,
        crc: orderId,
        md5sum: md5,
        result_url: settings.responseURL,
        merchant_description: settings.sellerName,
        return_url: settings.returnURLSuccess,
        return_error_url: settings.returnURLFailure,
        name: customer.name || (customer.firstName + customer.lastName) || '',
        email: customer.email || '',
      }

      return {
        redirectURL: url + qs.stringify(data, { addQueryPrefix: true })
      }
    },
    verifyPaymentByTpay(ctx) {
      const { clientIp } = ctx.meta
      const { params } = ctx

      const secureIps = [
        '195.149.229.109',
        '148.251.96.163',
        '178.32.201.77',
        '46.248.167.59',
        '46.29.19.106',
        '176.119.38.175'
      ]

      if (!secureIps.includes(clientIp)) {
        throw Error('Received tPay payment verification from untrusted IP!')
      }

      if (params.tr_status !== 'TRUE') {
        throw Error('Received tPay payment verification without TRUE status!')
      }

      if (params.tr_error !== 'none') {
        throw Error('Received tPay payment verification with error!')
      }

      const amountFixed = Number(params.tr_amount).toFixed(2)
      const responseMd5 = this.calculateResponseMd5SumTpay(params.tr_id, amountFixed, params.tr_crc)
      if (params.md5sum !== responseMd5) {
        throw Error('Received tPay payment verification with invalid checksum!')
      }

      // it must be a text/plain to be recognized by tPay
      const contentType = 'text/plain'
      ctx.meta.$responseType = contentType
      ctx.meta.$responseHeaders = {
        'Content-Type': contentType,
      }

      return {
        // this is confirmation for tPay server
        response: 'TRUE',
        orderId: params.tr_crc,
      }
    },
  }

}