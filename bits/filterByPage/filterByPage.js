const filterByPage = (page = 1, pageSize = 10) => (array, i) => {
  const pageFromZero = page - 1
  const firstItem = pageFromZero * pageSize
  const lastItem = (pageFromZero + 1) * pageSize - 1

  return i >= firstItem && i <= lastItem
}

module.exports = filterByPage