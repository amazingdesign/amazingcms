const crypto = require('crypto')
const qs = require('qs')

const { getConfigOrFail } = require('@bit/amazingdesign.utils.config')

const API_URL = getConfigOrFail('API_URL')

module.exports = {
  name: 'payments',

  mixins: [],

  hooks: {},

  settings: {
    paymentTittle: 'Payment from AmazingCMS',
    returnURLSuccess: 'https//google.com',
    returnURLFailure: 'https//google.com',
    responseURL: API_URL + '/api/payments/verify',
    sellerName: 'AmazingCMS',
    defaultMethod: 'tpay',
  },

  actions: {
    async create(ctx) {
      const { amount, orderId, method = this.settings.defaultMethod } = ctx.params

      if (!amount) throw Error('You must specify amount!')
      if (!orderId) throw Error('You must specify orderId!')

      switch (method) {
        case 'tpay':
          return this.createPaymentByTpay(amount, orderId)
        default:
          return { redirectURL: 'xXx' }
      }

    },
    verify(ctx) {
      return this.verifyPaymentByTpay(ctx)
    }
  },

  methods: {
    calculateResponseMd5SumTpay(transactionId, amount, crc) {
      const sellerId = 11092
      const securityCode = 'd07308cf4902a445'

      return crypto.createHash('md5').update(`${sellerId}${transactionId}${amount}${crc}${securityCode}`).digest('hex')
    },
    calculateRequestMd5SumTpay(amount, crc) {
      const sellerId = 11092
      const securityCode = 'd07308cf4902a445'

      return crypto.createHash('md5').update(`${sellerId}${amount}${crc}${securityCode}`).digest('hex')
    },
    createPaymentByTpay(amount, orderId, customer = {}) {
      const sellerId = 11092
      const url = 'https://secure.tpay.com'
      const crc = orderId
      const amountFixed = Number(amount).toFixed(2)
      const md5 = this.calculateRequestMd5SumTpay(amountFixed, crc)

      const data = {
        id: sellerId,
        amount: amountFixed,
        description: this.settings.paymentTittle,
        crc: orderId,
        md5sum: md5,
        result_url: this.settings.responseURL,
        merchant_description: this.settings.sellerName,
        return_url: this.settings.returnURLSuccess,
        return_error_url: this.settings.returnURLFailure,
        name: (customer.firstName + customer.lastName) || '',
        email: customer.email || '',
      }

      return {
        redirectURL: url + qs.stringify(data, { addQueryPrefix: true })
      }
    },
    verifyPaymentByTpay(ctx) {
      const { clientIp } = ctx.meta
      const { params } = ctx

      this.logger.info(params)

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
      if (params.md5sum !== responseMd5){
        throw Error('Received tPay payment verification with invalid checksum!')
      }

      // it must be a text/plain to be recognized by tPay
      const contentType = 'text/plain'
      ctx.meta.$responseType = contentType
      ctx.meta.$responseHeaders = {
        'Content-Type': contentType,
      }
      
      // this is confirmation for tPay server
      return 'TRUE'
    },
  }

}