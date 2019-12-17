/* eslint-disable max-lines */
'use strict'

const { GridFSBucket, ObjectID } = require('mongodb')
const sharp = require('sharp')

const DbService = require('../db/main')
const DbUtilsMixin = require('../bits/db-utilsmixin')

const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')

module.exports = {
  name: 'uploader',

  collection: 'fs.files',

  mixins: [
    DbService,
    DbUtilsMixin,
    EventDispatcherMixin,
  ],

  settings: {
    requiredPrivileges: {
      create: ['superadmin'],
      getProxy: ['superadmin'],
      listProxy: ['superadmin'],
      removeProxy: ['superadmin'],
    },
    maxPageSize: Number.MAX_SAFE_INTEGER
  },

  actions: {
    getSchema() {
      return {
        requiredPrivileges: {
          create: this.settings.requiredPrivileges.create,
          get: this.settings.requiredPrivileges.getProxy,
          list: this.settings.requiredPrivileges.listProxy,
          remove: this.settings.requiredPrivileges.removeProxy,
        },
      }
    },
    create(ctx) {
      const {
        filename,
        fieldname,
        encoding,
        mimetype,
        metadata,
      } = ctx.meta

      const fileStream = ctx.params
      const defaultBucketName = 'fs'
      const bucketName = (
        ctx.meta.bucketName ||
        (fieldname && fieldname.split('/')[0]) ||
        defaultBucketName
      )

      return this.saveFileStreamToGridFS(
        fileStream,
        filename,
        bucketName,
        {
          ...metadata,
          filename,
          fieldname,
          encoding,
          mimetype,
          bucketName,
        })
    },
    getProxy(ctx) {
      const { bucketName = 'fs', ...params } = ctx.params

      return this.getHelperService(`${bucketName}.files`)
        .then(service => service.actions.get(params))
    },
    listProxy(ctx) {
      const { bucketName = 'fs', ...params } = ctx.params

      return this.getHelperService(`${bucketName}.files`)
        .then(service => service.actions.list(params))
    },
    removeProxy(ctx) {
      const { id, bucketName = 'fs' } = ctx.params

      const cacheBucketName = `${bucketName}-cache`

      const bucket = new GridFSBucket(this.adapter.db, { bucketName })
      const cacheBucket = new GridFSBucket(this.adapter.db, { bucketName: cacheBucketName })

      return this.getHelperService(`${cacheBucketName}.files`)
        .then(service => service.actions.list({ query: { 'metadata.originalFileId': id } }))
        .then(results => {
          if (!results || !results.rows) return Promise.reject()

          const deleteCachePromises = results.rows.map(cachedFileData => {
            const cachedFileId = new ObjectID(cachedFileData._id)
            return cacheBucket.delete(cachedFileId).then(() => ({ _id: id, bucketName }))
          })

          const fileId = new ObjectID(id)
          const deletePromises = deleteCachePromises.concat(
            bucket.delete(fileId).then(() => ({ _id: id, bucketName }))
          )

          return Promise.all(deletePromises)
        })
    }
  },

  methods: {
    saveFileStreamToGridFS(fileStream, filename, bucketName, metadata) {
      return this.adapter.client.connect()
        .then(() => {
          const bucket = new GridFSBucket(this.adapter.db, { bucketName })

          const fileNameWithoutExt = filename && filename.replace(/\.[^/.]+$/, '')

          const uploadStream = bucket.openUploadStream(
            fileNameWithoutExt,
            { metadata }
          )

          const writePromise = new Promise((resolve, reject) => {
            uploadStream.once('finish', (data) => {
              this.logger.info(`File ${filename} was saved in bucket ${bucketName}!`)
              resolve({
                ...data,
                bucketName
              })
            })
            uploadStream.once('error', (err) => {
              this.logger.error(`Error saving file ${filename} in bucket ${bucketName}!`)
              reject(err)
            })
          })

          const compressedFileStream = (
            metadata.mimetype === 'image/png' ?
              fileStream.pipe(sharp().png({ compressionLevel: 7 }))
              :
              metadata.mimetype === 'image/jpeg' ?
                fileStream.pipe(sharp().jpeg({ quality: 70 }))
                :
                metadata.mimetype === 'image/webp' ?
                  fileStream.pipe(sharp().webp({ quality: 70 }))
                  :
                  fileStream
          )

          compressedFileStream.pipe(uploadStream)

          return writePromise
        })
    },
    getHelperService(collectionName) {
      const serviceName = `${collectionName}-uploader-helper`

      const service = this.broker.getLocalService(serviceName)

      if (service) return Promise.resolve(service)

      this.logger.info(`Creating helper service ${serviceName}...`)

      this.broker.createService({
        name: serviceName,

        collection: collectionName,

        mixins: [
          DbService,
          DbUtilsMixin,
        ],
      })

      return this.broker.waitForServices(serviceName)
        .then(() => this.broker.getLocalService(serviceName))
    }
  },

}