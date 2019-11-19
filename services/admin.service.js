'use strict'

const fs = require('fs')
const path = require('path')

module.exports = {
  name: 'admin',

  actions: {
    serve(ctx) {
      const pathToIndex = path.resolve('./public/index.html')
      const contents = fs.readFileSync(pathToIndex, 'utf8')

      const contentType = 'text/html'

      ctx.meta.$responseType = contentType
      ctx.meta.$responseHeaders = {
        'Content-Type': contentType,
      }

      return contents
    }
  }

}