module.exports = {
  hooks: {
    after: {
      '*': 'dispatchEvents',
    },
  },

  methods: {
    dispatchEvents(ctx, res){
      const fullActionName = ctx.action.name

      this.broker.broadcastLocal(fullActionName, res)
    },
  },
}