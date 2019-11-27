module.exports = {
  hooks: {
    after: {
      '*': 'dispatchEvents',
    },
  },

  methods: {
    dispatchEvents(ctx, res) {
      try {
        const fullActionName = ctx.action.name

        this.broker.emit(fullActionName, res)

        return res
      } catch (error) {
        return res
      }
    },
  },
}