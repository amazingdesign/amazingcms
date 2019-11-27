'use strict'
const { GridFSBucket, ObjectID } = require('mongodb')
const sharp = require('sharp')
const slugify = require('slugify')

const DbService = require('../db/main')
const DbUtilsMixin = require('../bits/db-utilsmixin')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')

module.exports = {
  name: 'downloader',

  collection: 'fs.files',

  mixins: [
    DbService,
    DbUtilsMixin,
    EventDispatcherMixin,
  ],

  settings: {
    requiredPrivileges: {},
  },

  actions: {
    get(ctx) {
      const { bucketName = 'fs', id: _id } = ctx.params

      return this.getFileFromGridFS(_id, bucketName)
        .then(({ downloadStream, fileData }) => {
          const filenameWithExt = (
            fileData &&
            fileData.metadata &&
            fileData.metadata.filename
          ) || fileData.filename

          const contentType = (
            fileData &&
            fileData.metadata &&
            fileData.metadata.mimetype
          )

          const filenameSlug =  slugify(filenameWithExt)

          ctx.meta.$responseType = contentType
          ctx.meta.$responseHeaders = {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${filenameSlug}"`
          }

          return this.processOutputStream(downloadStream, ctx.params)
        })
    },
  },

  methods: {
    getFileFromGridFS(fileId, bucketName) {
      return this.broker.call('uploader.getProxy', { bucketName, id: fileId })
        .then((fileData) => {
          const downloadStream = this.createDownloadStream(fileId, bucketName)
          return {
            downloadStream,
            fileData,
          }
        })
    },
    createDownloadStream(fileId, bucketName) {
      const bucket = new GridFSBucket(this.adapter.db, { bucketName })

      const id = new ObjectID(fileId)

      const downloadStream = bucket.openDownloadStream(id)

      return downloadStream
    },
    processOutputStream(stream, ctxParams) {
      return this.processResizeWithCache(stream, ctxParams)
    },
    processResizeWithCache(stream, ctxParams) {
      const { bucketName = 'fs', id: originalFileId, resize } = ctxParams

      if (!resize) return stream

      const cacheBucketName = `${bucketName}-cache`
      const cacheId = originalFileId + resize

      return this.broker.call(
        'uploader.listProxy',
        { bucketName: cacheBucketName, query: { 'metadata.cacheId': cacheId } }
      )
        .then((results) => {
          if (!results || !results.rows || results.rows.length !== 1) return Promise.reject()

          this.logger.info(`File with _id ${originalFileId} and resize params ${resize} found in cache!`)

          const result = results.rows[0]
          const cachedFileId = result._id

          return this.createDownloadStream(cachedFileId, cacheBucketName)
        })
        .catch(() => {
          this.logger.info(`File with _id ${originalFileId} and resize params ${resize} NOT found in cache!`)

          const { width, height, options } = JSON.parse(resize)

          const resizedStream = stream.pipe(sharp().resize(width, height, options))
          const createCallMeta = { bucketName: cacheBucketName, metadata: { cacheId, originalFileId } }
          const createCallOptions = { meta: createCallMeta }

          return this.broker.call('uploader.create', resizedStream, createCallOptions)
            .then(({ _id: createdCachedFileId }) => {
              this.logger.info('Save resized file to cache bucket. Serving from cache!')

              return this.createDownloadStream(createdCachedFileId, cacheBucketName)
            })
            .catch((err) => {
              this.logger.warn(err.message)
              this.logger.warn('Failed to save resized file to cache bucket. Serving directly!')

              return resizedStream
            })
        })
    }
  },

}