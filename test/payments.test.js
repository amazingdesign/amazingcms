'use strict'

process.env.API_URL = 'something'
process.env.PAYMENT_RETURN_URL_SUCCESS = 'something'
process.env.PAYMENT_RETURN_URL_FAILURE = 'something'
process.env.PAYMENT_TITLE_DEFAULT = 'something'
process.env.PAYMENT_SELLER_NAME_DEFAULT = 'something'
process.env.PAYMENT_TPAY_SELLER_ID = 'something'
process.env.PAYMENT_TPAY_SECURITY_CODE = 'something'

const { ServiceBroker } = require('moleculer')
const Validator = require('moleculer-json-schema-validator')

const OrdersService = require('../services/orders.service')
const PaymentsService = require('../services/payments.service')


describe('Test "payments" service', () => {
  const mockProducts = {
    '5dd679590d02f941837773ac': { name: 'Phone', price: 1000 },
    '5dd65b0a0d02f941837773aa': { name: 'Mouse', price: 150 },
    '5dd679590d02f941837773cc': { name: 'Free gadget' },
  }
  const MockProductsService = {
    name: 'products__pl',
    actions: {
      get(ctx) {
        const { params: { id } } = ctx

        const product = mockProducts[id]

        if (!product) return Promise.reject()

        return Promise.resolve(product)
      }
    }
  }
  const broker = new ServiceBroker({
    logger: false,
    validator: new Validator()
  })
  broker.createService(OrdersService)
  broker.createService(PaymentsService)
  broker.createService(MockProductsService)

  beforeAll(() => broker.start())
  afterAll(() => {
    delete process.env.API_URL
    delete process.env.PAYMENT_RETURN_URL_SUCCESS
    delete process.env.PAYMENT_RETURN_URL_FAILURE
    delete process.env.PAYMENT_TITLE_DEFAULT
    delete process.env.PAYMENT_SELLER_NAME_DEFAULT
    delete process.env.PAYMENT_TPAY_SELLER_ID
    delete process.env.PAYMENT_TPAY_SECURITY_CODE

    return broker.stop()
  })

  it('orders free after payment get "paid" status', () => {
    expect.assertions(2)
    const basket = [ // total 0
      { id: '5dd679590d02f941837773cc', collectionName: 'products', quantity: 3 },
    ]

    return broker.call('orders.create', { basket, buyerEmail: 'example@example.com' })
      .then((order) => {
        expect(order.orderTotal).toBe(0)
        return order
      })
      .then((order) => (
        broker.call('payments.create', { orderId: order._id })
          .then(() => order)
      ))
      .then((order) => (
        broker.call('orders.get', { id: order._id })
      ))
      .then((order) => expect(order.status).toBe('paid'))
  })

})