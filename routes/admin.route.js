const matchAllRoutes = () => (
  Array(100).fill(0).map((el, i) => `:${i}?`).join('/')
)

module.exports = {
  path: '/admin',
  aliases: {
    [matchAllRoutes()]: 'admin.serve',
  },
  whitelist: [
    'admin.serve'
  ]
}