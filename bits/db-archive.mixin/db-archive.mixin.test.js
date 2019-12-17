/* eslint-disable max-lines */
'use strict'

const DbService = require('moleculer-db')
const { ServiceBroker } = require('moleculer')
const { Errors: WebErrors } = require('moleculer-web')

const DbArchiveMixin = require('./db-archive.mixin')


describe('Test "db-archive" mixin', () => {
  const broker = new ServiceBroker({ logger: false })
  broker.createService({
    name: 'mockdb',

    mixins: [
      DbArchiveMixin,
      DbService,
    ],
  })
  const ITEMS = [
    { name: '1', order: 1 },
    { name: '2', order: 2 },
    { name: '3', order: 3 },
    { name: '4', order: 4 },
    { name: '5', order: 5, _archived: false },
    { name: '6', order: 6, _archived: false },
    { name: '7', order: 7 },
    { name: '8', order: 8 },
    { name: '9', order: 9, _archived: true },
    { name: '10', order: 10, _archived: true },
    { name: '11', order: 11 },
    { name: '12', order: 12 },
    { name: '13', order: 13 },
    { name: '14', order: 14 },
    { name: '15', order: 15 },
    { name: '16', order: 16 },
  ]
  const makeItemsInMockDb = () => {
    const createItem = (item) => broker.call('mockdb.create', item)

    return ITEMS.reduce(
      (r, item) => r.then(() => createItem(item)),
      Promise.resolve()
    )
  }

  beforeAll(() => {
    return broker.start()
      .then(makeItemsInMockDb)
  })
  afterAll(() => broker.stop())

  const filterIds = (array) => array.map((item) => ({
    ...item,
    _id: undefined
  }))
  const filterArchived = (array) => array.filter(item => !item._archived)
  const filterNotArchived = (array) => array.filter(item => item._archived)

  it('do not show archived items when find', () => {
    expect.assertions(1)

    return broker.call('mockdb.find', { sort: 'order' })
      .then((data) => {
        const dataWithoutIds = filterIds(data)

        expect(dataWithoutIds).toEqual(filterArchived(ITEMS))
      })
  })

  it('do not show archived items when list', () => {
    expect.assertions(1)

    return broker.call('mockdb.list', { sort: 'order', pageSize: 10 })
      .then((data) => {
        const dataWithoutIds = filterIds(data.rows)

        expect(dataWithoutIds).toEqual(
          filterArchived(ITEMS).filter((item, i) => i < 10)
        )
      })
  })

  it('do not show archived items when list page 2', () => {
    expect.assertions(1)

    return broker.call('mockdb.list', { sort: 'order', pageSize: 10, page: 2 })
      .then((data) => {
        const dataWithoutIds = filterIds(data.rows)

        expect(dataWithoutIds).toEqual(
          filterArchived(ITEMS).filter((item, i) => i >= 10)
        )
      })
  })

  it('count without archived items', () => {
    expect.assertions(1)

    return broker.call('mockdb.count', { sort: 'order' })
      .then((data) => expect(data).toBe(14))
  })

  it('show archived items when find and _archived param passed', () => {
    expect.assertions(1)

    return broker.call('mockdb.find', { sort: 'order', query: { _archived: true } })
      .then((data) => {
        const dataWithoutIds = filterIds(data)

        expect(dataWithoutIds).toEqual(filterNotArchived(ITEMS))
      })
  })

  it('show archived items when list and _archived param passed', () => {
    expect.assertions(1)

    return broker.call('mockdb.list', { sort: 'order', pageSize: 10, query: { _archived: true } })
      .then((data) => {
        const dataWithoutIds = filterIds(data.rows)

        expect(dataWithoutIds).toEqual(
          filterNotArchived(ITEMS).filter((item, i) => i < 10)
        )
      })
  })

  it('show archived items when list page 2 and _archived param passed', () => {
    expect.assertions(1)

    return broker.call('mockdb.list', { sort: 'order', pageSize: 10, page: 2, query: { _archived: true } })
      .then((data) => {
        const dataWithoutIds = filterIds(data.rows)

        expect(dataWithoutIds).toEqual([])
      })
  })

  it('count archived items when _archived param passed', () => {
    expect.assertions(1)

    return broker.call('mockdb.count', { sort: 'order', query: { _archived: true } })
      .then((data) => expect(data).toBe(2))
  })

  it('archives instead removing', () => {
    const ITEM_NAME = '1'
    expect.assertions(1)

    return broker.call('mockdb.find', { query: { name: ITEM_NAME } })
      .then(([item]) => item)
      .then((item) => {
        return broker.call('mockdb.remove', { id: item._id })
          .then(() => broker.call('mockdb.get', { id: item._id }, { meta: { skipNotShowArchived: true } }))
          .then((archivedItem) => expect(archivedItem._archived).toBe(true))
      })
  })

  it('second archive call un-archive item', () => {
    const ITEM_NAME = '2'
    expect.assertions(2)

    return broker.call('mockdb.find', { query: { name: ITEM_NAME } })
      .then(([item]) => item)
      .then((item) => {
        return broker.call('mockdb.remove', { id: item._id })
          .then(() => broker.call('mockdb.get', { id: item._id }, { meta: { skipNotShowArchived: true } }))
          .then((archivedItem) => expect(archivedItem._archived).toBe(true))
          .then(() =>  broker.call('mockdb.remove', { id: item._id }))
          .then(() => broker.call('mockdb.get', { id: item._id }, { meta: { skipNotShowArchived: true } }))
          .then((unArchivedItem) => expect(unArchivedItem._archived).toBe(false))
      })
  })

})