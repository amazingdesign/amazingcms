'use strict'

const { ServiceBroker } = require('moleculer')
const Validator = require('moleculer-json-schema-validator')

const OrdersService = require('../services/orders.service')

describe('Test "orders" service', () => {
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
  const mockBooks = {
    '5d7e6a5542dee364294cff2c': { name: 'Harry Potter', price: 20 },
    '5d7e6a5542dee364294cff2z': { name: 'Tom and Jerry', price: 15 },
  }
  const MockBooksService = {
    name: 'books__pl',
    actions: {
      get(ctx) {
        const { params: { id } } = ctx

        const product = mockBooks[id]

        if (!product) return Promise.reject()

        return Promise.resolve(product)
      }
    }
  }
  const broker = new ServiceBroker({ logger: false, validator: new Validator() })
  broker.createService(OrdersService)
  broker.createService(MockProductsService)
  broker.createService(MockBooksService)

  beforeAll(() => broker.start())
  afterAll(() => broker.stop())

  it('can calculate orderTotal for 1-item basket', () => {
    expect.assertions(1)

    const basket = [
      { id: '5dd679590d02f941837773ac', collectionName: 'products' },
    ]

    return broker.call('orders.create', { basket })
      .then(order => expect(order.orderTotal).toBe(1000))
  })

  it('can calculate orderTotal for 2-items basket', () => {
    expect.assertions(1)

    const basket = [
      { id: '5dd679590d02f941837773ac', collectionName: 'products' },
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
    ]

    return broker.call('orders.create', { basket })
      .then(order => expect(order.orderTotal).toBe(1150))
  })

  it('can calculate orderTotal for empty basket', () => {
    expect.assertions(1)

    const basket = []

    return broker.call('orders.create', { basket })
      .then(order => expect(order.orderTotal).toBe(0))
  })
  
  it('can calculate orderTotal for 1-item basket with quantity', () => {
    expect.assertions(1)

    const basket = [
      { id: '5dd679590d02f941837773ac', collectionName: 'products', quantity: 3 },
    ]

    return broker.call('orders.create', { basket })
      .then(order => expect(order.orderTotal).toBe(3000))
  })

  it('can calculate orderTotal for 2-items basket with quantity', () => {
    expect.assertions(1)

    const basket = [
      { id: '5dd679590d02f941837773ac', collectionName: 'products', quantity: 3 },
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products', quantity: 20 },
    ]

    return broker.call('orders.create', { basket })
      .then(order => expect(order.orderTotal).toBe(6000))
  })

  it('can calculate orderTotal for 1-items basket with free product', () => {
    expect.assertions(1)

    const basket = [
      { id: '5dd679590d02f941837773cc', collectionName: 'products', quantity: 20 },
    ]

    return broker.call('orders.create', { basket })
      .then(order => expect(order.orderTotal).toBe(0))
  })
 
  it('can calculate orderTotal for 2-items basket with different collections products', () => {
    expect.assertions(1)

    const basket = [
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products'},
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]

    return broker.call('orders.create', { basket })
      .then(order => expect(order.orderTotal).toBe(170))
  })

})