

module.exports = {
  name: 'events',

  mixins: [],

  events: {
    '*': function (...all) {
      this.logger.warn('EVENT!')
      this.logger.warn(JSON.stringify(all))
    }
  },

  created(){
    this.broker.emit('created')
  },
  started(){
    this.broker.emit('started')
  },

  hooks: {},

  settings: {},

  actions: {},

  methods: {}
}