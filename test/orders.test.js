'use strict'

const { ServiceBroker } = require('moleculer')
const Validator = require('moleculer-json-schema-validator')

const OrdersService = require('../services/orders.service')
const ActionsService = require('../services/actions.service')

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
  const broker = new ServiceBroker({
    logger: false,
    validator: new Validator()
  })
  broker.createService(ActionsService)
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
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]

    return broker.call('orders.create', { basket })
      .then(order => expect(order.orderTotal).toBe(170))
  })

  it('can populate products in basket', () => {
    expect.assertions(1)

    const basket = [
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5dd679590d02f941837773ac', collectionName: 'products' },
    ]

    return broker.call('orders.create', { basket })
      .then(({ _id }) => broker.call('orders.get', { id: _id, populate: ['basket'] }))
      .then((order) => (
        expect(order.basket).toEqual([
          { ...basket[0], name: 'Mouse', price: 150 },
          { ...basket[1], name: 'Phone', price: 1000 },
        ])
      ))
  })

  it('can populate products in basket for multiple collections', () => {
    expect.assertions(1)

    const basket = [
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]

    return broker.call('orders.create', { basket })
      .then(({ _id }) => broker.call('orders.get', { id: _id, populate: ['basket'] }))
      .then((order) => (
        expect(order.basket).toEqual([
          { ...basket[0], name: 'Mouse', price: 150 },
          { ...basket[1], name: 'Harry Potter', price: 20 },
        ])
      ))
  })

  it('can get order but no user related data if do not have permissions to list all data', () => {
    expect.assertions(1)

    const basket = [
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]
    const additionalInfo = { address: 'Secret Street 123' }
    const buyerEmail = 'example@example.com'

    return broker.call('orders.create', { basket, additionalInfo, buyerEmail })
      .then((wholeOrder) => {
        return broker.call('orders.get', { id: wholeOrder._id })
          .then((orderFromGet) => (
            expect(orderFromGet).toEqual({
              ...wholeOrder,
              additionalInfo: undefined,
              buyerEmail: undefined,
            })
          ))
      })
  })

  it('can get order with user related data if have permissions to list all data', () => {
    expect.assertions(1)

    const metaWithSuperAdminPrivileges = {
      meta: { decodedToken: { privileges: ['superadmin'] } }
    }

    const basket = [
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]
    const additionalInfo = { address: 'Secret Street 123' }
    const buyerEmail = 'example@example.com'

    return broker.call('orders.create', { basket, additionalInfo, buyerEmail })
      .then((wholeOrder) => {
        return broker.call('orders.get', { id: wholeOrder._id }, metaWithSuperAdminPrivileges)
          .then((orderFromGet) => expect(orderFromGet).toEqual(wholeOrder))
      })
  })

  it('can update order when it is create status', () => {
    expect.assertions(2)

    const basket = [
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]
    const additionalInfo = { address: 'Secret Street 123' }
    const buyerEmail = 'example@example.com'
    const order = { basket, additionalInfo, buyerEmail }

    return broker.call('orders.create', order)
      .then((wholeOrder) => broker.call(
        'orders.update',
        { id: wholeOrder._id, buyerEmail: 'updated@example.com', status: 'updated' }
      ).then((updatedOrder) => ({ wholeOrder, updatedOrder })))
      .then(({ wholeOrder, updatedOrder }) => {
        expect(updatedOrder).toEqual({
          ...wholeOrder,
          updatedAt: expect.any(Date),
          buyerEmail: 'updated@example.com', status: 'updated'
        })
        return updatedOrder
      })
      .then((updatedOrder) => broker.call(
        'orders.update',
        { id: updatedOrder._id, buyerEmail: 'updated-x-2@example.com' }
      ))
      .catch((error) => expect(error.message).toBe('Only orders with "created" status can be updated!'))
  })

})