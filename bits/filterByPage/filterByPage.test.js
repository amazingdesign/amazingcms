const filterByPage = require('./filterByPage')

describe('Test filterByPage function', () => {

  it('can filter by page array of numbers with default values ', () => {
    const numbers = Array(111).fill(1).map((el, i) => i)

    expect(numbers.filter(filterByPage())).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(numbers.filter(filterByPage(2))).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
    expect(numbers.filter(filterByPage(12))).toEqual([110])
  })

  it('can filter by page array of numbers ', () => {
    const numbers = Array(111).fill(1).map((el, i) => i)

    expect(numbers.filter(filterByPage(1, 5))).toEqual([0, 1, 2, 3, 4])
    expect(numbers.filter(filterByPage(1, 1))).toEqual([0])
    expect(numbers.filter(filterByPage(23, 5))).toEqual([110])
  })

})