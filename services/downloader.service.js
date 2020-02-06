/* eslint-disable max-lines */
'use strict'
const { GridFSBucket, ObjectID } = require('mongodb')
const sharp = require('sharp')
const slugify = require('slugify')

const DbService = require('../db/main')
const DbUtilsMixin = require('../bits/db-utilsmixin')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')

const removeExt = (str) => str.split('.').slice(0, -1).join('.')

module.exports = {
  name: 'downloader',

  collection: 'fs.files',

  hooks: {
    before: {
      get: 'convertStringResizeParam'
    }
  },

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

          const convertedContentType = ctx.params && ctx.params.convert && ctx.params.convert.format
          const contentType = convertedContentType || (
            fileData &&
            fileData.metadata &&
            fileData.metadata.mimetype
          )

          const filenameWithExtSlug = slugify(filenameWithExt)
          const filenameSlug = filenameWithExtSlug.includes('.') ? removeExt(filenameWithExtSlug) : filenameWithExtSlug

          ctx.meta.$responseType = contentType
          ctx.meta.$responseHeaders = {
            'Cache-Control': 'max-age=31557600', // cache for year
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${filenameSlug}"`
          }

          return this.processOutputStream(downloadStream, ctx.params, ctx.meta)
        })
    },
  },

  methods: {
    convertStringResizeParam(ctx) {
      const resizeParam = ctx.params && ctx.params.resize
      if (typeof resizeParam === 'string') {
        this.logger.info('Detected old version of resize pram as JSON string, trying to parse!')
        try {
          ctx.params.resize = JSON.parse(resizeParam)
          this.logger.info('Successfully parsed old version of resize pram as JSON string!')
        } catch (error) {
          ctx.param.resize = undefined
          this.logger.error('Failed parsing old version of resize pram as JSON string! Removing this param!')
        }
      }

      return ctx
    },
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
    createCacheData(ctxParams) {
      const { bucketName = 'fs', id: originalFileId } = ctxParams

      const cacheBucketName = `${bucketName}-cache`
      const cacheId = JSON.stringify(ctxParams)

      return { cacheBucketName, cacheId, originalFileId }
    },
    getFileFromCache(ctxParams) {
      const { cacheBucketName, cacheId, originalFileId } = this.createCacheData(ctxParams)

      return this.broker.call(
        'uploader.listProxy',
        { bucketName: cacheBucketName, query: { 'metadata.cacheId': cacheId } }
      )
        .then((results) => {
          if (!results || !results.rows || results.rows.length !== 1) return Promise.reject()

          this.logger.info(`File with _id ${originalFileId} and params ${cacheId} found in cache!`)

          const result = results.rows[0]
          const cachedFileId = result._id

          return this.createDownloadStream(cachedFileId, cacheBucketName)
        })
        .catch((...all) => {
          this.logger.info(`File with _id ${originalFileId} and params ${cacheId} NOT found in cache!`)

          return Promise.reject(...all)
        })
    },
    saveFileInCacheThenServe(stream, ctxParams) {
      const { cacheBucketName, cacheId, originalFileId } = this.createCacheData(ctxParams)

      const createCallMeta = { bucketName: cacheBucketName, metadata: { cacheId, originalFileId } }
      const createCallOptions = { meta: createCallMeta }

      return this.broker.call('uploader.create', stream, createCallOptions)
        .then(({ _id: createdCachedFileId }) => {
          this.logger.info('Save resized file to cache bucket. Serving from cache!')

          return this.createDownloadStream(createdCachedFileId, cacheBucketName)
        })
        .catch((err) => {
          this.logger.warn(err.message)
          this.logger.warn('Failed to save resized file to cache bucket. Serving directly!')

          return stream
        })
    },
    processOutputStream(stream, ctxParams, ctxMeta) {
      return this.getFileFromCache(ctxParams)
        // if image not fount then process image
        .catch(() => {
          const resizedStream = this.processResize(stream, ctxParams)
          const convertedStream = this.processConversion(resizedStream, ctxParams, ctxMeta)
          const outputStream = this.saveFileInCacheThenServe(convertedStream, ctxParams)

          return Promise.resolve(outputStream)
        })
        .catch((error) => {
          this.logger.error('Failed to process image, serving NOT processed!')
          this.logger.error(error.message)

          return Promise.resolve(stream)
        })
    },
    processResize(stream, ctxParams) {
      const { resize } = ctxParams

      if (!resize) return stream

      const width = Number(resize.width) || undefined
      const height = Number(resize.height) || undefined

      return stream.pipe(sharp().resize(width, height, resize.options))
    },
    processConversion(stream, ctxParams, ctxMeta) {
      const { convert } = ctxParams

      if (!convert) return stream

      const { format, checkWebpSupport } = convert

      // check webp support in browser
      // if webp-fallback is set
      if (
        (format === 'webp' && checkWebpSupport)
        &&
        !(
          ctxMeta &&
          ctxMeta.headers &&
          ctxMeta.headers.accept &&
          ctxMeta.headers.accept.includes('image/webp')
        )
      ) {
        return stream
      }

      return stream.pipe(sharp().toFormat(format))
    },
  },

}