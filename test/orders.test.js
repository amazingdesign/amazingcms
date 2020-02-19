'use strict'

const { ServiceBroker } = require('moleculer')
const Validator = require('moleculer-json-schema-validator')

const OrdersService = require('../services/orders.service')
const ActionsService = require('../services/actions.service')

describe('Test "orders" service', () => {
  const mockCoupons = {
    'COUPONNOTACTIVE': { active: false, name: 'COUPON1.33', percentDiscount: 1.33 },
    'COUPON1.33': { active: true, name: 'COUPON1.33', percentDiscount: 1.33 },
    'COUPON50': { active: true, name: 'COUPON50', percentDiscount: 50 },
  }
  const MockCouponsService = {
    name: 'coupons',
    actions: {
      find(ctx) {
        const { params: { query: { name } } } = ctx

        const coupon = mockCoupons[name]

        if (!coupon) return []

        return Promise.resolve([coupon])
      }
    }
  }
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
  broker.createService(MockCouponsService)
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

  it('do not allow to update order total through API update call', () => {
    expect.assertions(1)

    const basket = [  // total 150 + 20 = 170
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]
    const order = { basket }

    return broker.call('orders.create', order)
      .then(({ _id: id }) => broker.call('orders.update', { id, orderTotal: 0.01 }))
      .then((updatedOrder) => expect(updatedOrder.orderTotal).toBe(170))
  })

  it('do not allow to update order status when user is not authorized to list', () => {
    expect.assertions(1)

    const basket = [
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]
    const order = { basket }

    return broker.call('orders.create', order)
      .then(({ _id: id }) => broker.call('orders.update', { id, status: 'paid' }))
      .then((updatedOrder) => expect(updatedOrder.status).toBe('created'))
  })
  
  it('allow to update order status when user is authorized to list', () => {
    expect.assertions(1)

    const metaWithSuperAdminPrivileges = {
      meta: { decodedToken: { privileges: ['superadmin'] } }
    }
    const basket = [
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]
    const order = { basket }

    return broker.call('orders.create', order)
      .then(({ _id: id }) => broker.call('orders.update', { id, status: 'paid' }, metaWithSuperAdminPrivileges))
      .then((updatedOrder) => expect(updatedOrder.status).toBe('paid'))
  })

  it('can save witch coupon is used', () => {
    expect.assertions(1)

    const basket = [  // total 150 + 20 = 170
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]
    const coupon = 'COUPON50'
    const order = { basket, coupon }

    return broker.call('orders.create', order)
      .then((newOrder) => expect(newOrder.coupon).toBe(coupon))
  })

  it('can calculate price from % coupon', () => {
    expect.assertions(2)

    const basket = [  // total 150 + 20 = 170
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]
    const coupon = 'COUPON50'
    const order = { basket, coupon }

    return broker.call('orders.create', order)
      .then((newOrder) => {
        expect(newOrder.orderTotal).toBe(85)
        expect(newOrder.discountAmount).toBe(85)
      })
  })

  it('can calculate price from % coupon with floating point', () => {
    expect.assertions(2)

    const basket = [  // total 150 + 20 = 170
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]
    const coupon = 'COUPON1.33'
    const order = { basket, coupon }

    return broker.call('orders.create', order)
      .then((newOrder) => {
        expect(newOrder.orderTotal).toBe(167.74)
        expect(newOrder.discountAmount).toBe(2.26)
      })
  })

  it('restore orderTotal and discountAmount after coupon is cleared', () => {
    expect.assertions(2)

    const basket = [  // total 150 + 20 = 170
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]
    const coupon = 'COUPON50'
    const order = { basket, coupon }

    return broker.call('orders.create', order)
      .then(({ _id: id }) => broker.call('orders.update', { id, coupon: '' }))
      .then((updatedOrder) => {
        expect(updatedOrder.orderTotal).toBe(170)
        expect(updatedOrder.discountAmount).toBe(0)
      })
  })

  it('can calculate price from  new coupon only when update', () => {
    expect.assertions(2)

    const basket = [  // total 150 + 20 = 170
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]
    const coupon1 = 'COUPON50'
    const coupon2 = 'COUPON1.33'
    const order = { basket, coupon1 }

    return broker.call('orders.create', order)
      .then(({ _id: id }) => broker.call('orders.update', { id, coupon: coupon2 }))
      .then((updatedOrder) => {
        expect(updatedOrder.orderTotal).toBe(167.74)
        expect(updatedOrder.discountAmount).toBe(2.26)
      })
  })

  it('throws when coupon not find', () => {
    expect.assertions(1)

    const basket = [  // total 150 + 20 = 170
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]
    const coupon = 'COUPONNOTEXISTING'
    const order = { basket, coupon }

    return broker.call('orders.create', order)
      .catch((error) => expect(error.message).toBe('Coupon not found!'))
  })

  it('throws when coupon not active', () => {
    expect.assertions(1)

    const basket = [  // total 150 + 20 = 170
      { id: '5dd65b0a0d02f941837773aa', collectionName: 'products' },
      { id: '5d7e6a5542dee364294cff2c', collectionName: 'books', quantity: 1 },
    ]
    const coupon = 'COUPONNOTACTIVE'
    const order = { basket, coupon }

    return broker.call('orders.create', order)
      .catch((error) => expect(error.message).toBe('Coupon not active!'))
  })

})