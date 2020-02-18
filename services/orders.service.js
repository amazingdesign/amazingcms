/* eslint-disable max-lines */
const DbService = require('../db/main')
const DbMetadata = require('@bit/amazingdesign.moleculer.db-metadatamixin')
const DbUtilsMixin = require('../bits/db-utilsmixin')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')
const DbArchiveMixin = require('../bits/db-archive.mixin')

const PRODUCT_FIELDS = ['price', 'currency', 'name', 'photo', 'published', 'description']
const ORDER_STATUSES = ['created', 'pending', 'paid', 'packed', 'shipped', 'received', 'done']
const ORDER_STATUSES_OPTIONS = ORDER_STATUSES.map((status) => ({ label: status, value: status }))

module.exports = {
  name: 'orders',

  collection: 'orders',

  mixins: [
    DbArchiveMixin,
    DbService,
    DbMetadata,
    DbUtilsMixin,
    EventDispatcherMixin,
  ],

  hooks: {
    before: {
      create: [
        'addFirstStatus',
        'calculateOrderTotal',
        'applyCoupon',
      ],
      update: [
        'removeOrderTotalFromUpdateParams',
        'removeStatusFromUpdateParamsIfNotAuthorizedToFind',
        'calculateOrderTotal',
        'applyCoupon',
      ]
    },
    after: {
      get: 'removeBuyerRelatedDataIfNotAuthorizedToFind'
    }
  },

  settings: {
    requiredPrivileges: {
      count: ['superadmin'],
      list: ['superadmin'],
      insert: ['superadmin'],
      create: [],
      get: [],
      update: [],
      remove: ['superadmin'],
      getSchema: ['superadmin'],
    },
    fields: [
      '_id',
      '_archived',
      'createdAt',
      'updatedAt',
      'buyerEmail',
      'basket',
      'orderTotal',
      'status',
      'additionalInfo',
      'coupon',
      'discountAmount',
    ],
    entityValidator: {
      type: 'object',
      required: ['basket', 'orderTotal', 'status'],
      properties: {
        buyerEmail: { type: 'string', format: 'email' },
        basket: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'collectionName'],
            properties: {
              id: { type: 'string' },
              collectionName: { type: 'string' },
              quantity: { type: 'number' },
            }
          },
        },
        orderTotal: { type: 'number' },
        status: {
          type: 'string',
          options: ORDER_STATUSES_OPTIONS,
        },
        additionalInfo: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            street: { type: 'string' },
            zip: { type: 'string' },
            city: { type: 'string' },
            nip: { type: 'string' },
            consentMarketing: { type: 'boolean' },
            consentData: { type: 'boolean' },
            consentRegulations: { type: 'boolean' },
          }
        },
        coupon: { type: 'string' }
      }
    },
    populates: {
      basket: function (ids, items, rule, ctx) {
        const populationItemsPromises = ids.map(({ id, collectionName, quantity }) => {
          return this.broker.call(
            'actions.get',
            { id, fields: PRODUCT_FIELDS },
            { meta: { collectionName } }
          )
            .then((product) => ({ ...product, id, collectionName, quantity }))
            .catch(() => ({ id, collectionName, quantity }))
        })

        return Promise.all(populationItemsPromises)
          .then((populationItems) => {
            items.forEach((item) => {
              item.basket = item.basket.map((basketItem) => (
                populationItems.find((populationItem) => populationItem.id === basketItem.id)
              ))
            })
          })
      },
    },
  },

  actions: {
    async getSchema(ctx) {
      return {
        schema: {
          type: 'object',
          required: ['basket'],
          properties: {
            buyerEmail: { type: 'string', format: 'email' },
            basket: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'collectionName'],
                properties: {
                  id: { type: 'string' },
                  collectionName: {
                    type: 'string',
                    options: await this.createOptionsFromService('collections', 'displayName', 'name'),
                  },
                  quantity: { type: 'number' },
                }
              },
              uniforms: { component: 'ListFieldReorder' }
            },
            status: {
              type: 'string',
              options: ORDER_STATUSES_OPTIONS,
              uniforms: { component: 'MuiReactSelectField' }
            },
            additionalInfo: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                street: { type: 'string' },
                zip: { type: 'string' },
                city: { type: 'string' },
                nip: { type: 'string' },
                consentMarketing: { type: 'boolean' },
                consentData: { type: 'boolean' },
                consentRegulations: { type: 'boolean' },
              }
            },
            coupon: {
              type: 'string',
              options: await this.createOptionsFromService('coupons', 'name', 'name'),
              uniforms: { component: 'MuiReactSelectField' },
            },
            discountAmount: { type: 'number', uniforms: { fullWidth: true, disabled: true } },
          }
        },
        icon: 'fas fa-shopping-basket',
        displayName: 'Orders',
        tableFields: [
          { label: 'Order total', name: 'orderTotal', columnRenderType: 'currency' },
          { label: 'Discount amount', name: 'discountAmount', columnRenderType: 'currency' },
          { label: 'Coupon', name: 'coupon', columnRenderType: 'chips' },
          { label: 'Status', name: 'status', columnRenderType: 'chips' },
          { label: 'Email', name: 'buyerEmail' },
          { label: 'Name', name: 'additionalInfo.name' },
          { label: 'NIP', name: 'additionalInfo.nip' },
          { label: 'Street', name: 'additionalInfo.street' },
          { label: 'Zip code', name: 'additionalInfo.zip' },
          { label: 'City', name: 'additionalInfo.city' },
          { label: 'Consent - marketing', name: 'additionalInfo.consentMarketing', columnRenderType: 'boolean-icon' },
          { label: 'Consent - data', name: 'additionalInfo.consentData', columnRenderType: 'boolean-icon' },
          // eslint-disable-next-line max-len
          { label: 'Consent - regulations', name: 'additionalInfo.consentRegulations', columnRenderType: 'boolean-icon' },
          { label: 'ID', name: '_id', columnRenderType: 'chips' },
          { label: 'Created', name: 'createdAt', columnRenderType: 'date-time' },
          { label: 'Updated', name: 'updatedAt', columnRenderType: 'date-time' },
        ],
        requiredPrivileges: this.settings.requiredPrivileges,
      }
    },
  },

  methods: {
    addFirstStatus: (ctx) => {
      ctx.params.status = 'created'
      return ctx
    },
    calculateOrderTotal(ctx) {
      const { basket } = ctx.params

      // it will fail on entity validation
      if (!basket || !Array.isArray(basket)) return ctx

      const basketPromises = basket.map((item) => {
        const { collectionName, id, quantity } = item
        // @TODO default lang form settings maybe
        const language = 'pl'

        return this.broker.call(`${collectionName}__${language}.get`, { id })
          .then((itemData) => ({ ...itemData, quantity }))
      })

      const calculateOrderTotalSync = (basket) => basket.reduce(
        (r, item) => {
          const priceForItem = (item.quantity ? item.price * item.quantity : item.price) || 0

          return r + priceForItem
        },
        0
      )

      return Promise.all(basketPromises)
        .then(calculateOrderTotalSync)
        .then((orderTotal) => {
          ctx.params.orderTotal = orderTotal

          return ctx
        })
    },
    async applyCoupon(ctx) {
      const actionName = ctx.action.rawName
      const { coupon } = ctx.params

      if (!coupon) return ctx

      const [couponFromDb] = await this.broker.call('coupons.find', { query: { name: coupon } })
      if (!couponFromDb) throw new Error('Coupon not found!')
      const { active, percentDiscount } = couponFromDb

      if (!active) throw new Error('Coupon not active!')
      if (!percentDiscount) return ctx

      const { orderTotal } = actionName === 'create' ?
        ctx.params
        :
        await this.broker.call('orders.get', { id: ctx.params && ctx.params.id })

      if (!orderTotal) throw new Error('Error processing order!')

      const roundTo2Decimals = (price) => Math.round(price * 100) / 100
      const decimalDiscount = percentDiscount / 100
      const discountAmount = roundTo2Decimals(orderTotal * decimalDiscount)
      const orderTotalAfterCoupon = orderTotal - discountAmount
      const newOrderTotal = orderTotalAfterCoupon < 0 ? 0 : orderTotalAfterCoupon

      ctx.params.discountAmount = discountAmount
      ctx.params.orderTotal = newOrderTotal

      return ctx
    },
    removeOrderTotalFromUpdateParams(ctx) {
      if (ctx && ctx.params && ctx.params.orderTotal) {
        delete ctx.params.orderTotal
        return ctx
      }
      return ctx
    },
    checkIfIsAuthorizedToFind(ctx) {
      const privilegesToCheck = this.settings.requiredPrivileges.list
      const allPrivileges = this.getAllPrivileges(ctx)
      const matchedPrivileges = privilegesToCheck.filter(
        privilegeToCheck => allPrivileges.includes(privilegeToCheck)
      )

      return matchedPrivileges.length !== 0
    },
    removeBuyerRelatedDataIfNotAuthorizedToFind(ctx, res) {
      if (!this.checkIfIsAuthorizedToFind(ctx)) {
        return this.removeFieldFromResponses('buyerEmail')(ctx,
          this.removeFieldFromResponses('additionalInfo')(ctx, res)
        )
      }

      return res
    },
    removeStatusFromUpdateParamsIfNotAuthorizedToFind(ctx) {
      if (
        ctx &&
        ctx.params &&
        ctx.params.status &&
        !this.checkIfIsAuthorizedToFind(ctx)
      ) {
        delete ctx.params.status
        return ctx
      }

      return ctx
    },
  }

}