/* eslint-disable max-lines */
'use strict'

const _ = require('lodash')
const jwt = require('jsonwebtoken')

const DbService = require('../db/main')
const DbUtilsMixin = require('../bits/db-utilsmixin')
const EventDispatcherMixin = require('../bits/event-dispatcher.mixin')
const DbMetadata = require('@bit/amazingdesign.moleculer.db-metadatamixin')
const DbArchiveMixin = require('../bits/db-archive.mixin')

const { getConfigOrFail } = require('@bit/amazingdesign.utils.config')
const Mux = require('@mux/mux-node')

const API_URL = getConfigOrFail('API_URL')
const MUX_PRIVATE_KEY = getConfigOrFail('MUX_PRIVATE_KEY')
const MUX_KID = getConfigOrFail('MUX_KID')
const { Video } = new Mux()

module.exports = {
  name: 'mux',

  collection: 'mux',

  mixins: [
    DbArchiveMixin,
    DbService,
    DbMetadata,
    DbUtilsMixin,
    EventDispatcherMixin,
  ],

  settings: {
    requiredPrivileges: {
      webhooks: [],
      createUploadUrl: ['superadmin', 'admin', 'writter'],
      get: ['superadmin', 'admin', 'writter'],
      list: ['superadmin', 'admin', 'writter'],
      getSchema: ['superadmin', 'admin', 'writter'],
      update: ['$NONE'],
      create: ['$NONE'],
      remove: ['$NONE'],
      token: ['$ALL_AUTHENTICATED'],
    },
    maxPageSize: Number.MAX_SAFE_INTEGER
  },

  actions: {
    getSchema() {
      return {
        schema: {
          type: 'object',
          required: [],
          properties: {
            name: {
              type: 'string',
              uniforms: {
                label: 'File name',
              }
            },
            lastEventType: {
              type: 'string',
              options: [
                { label: 'Upload - asset created', value: 'video.upload.asset_created' },
                { label: 'Upload - created', value: 'video.upload.created' },
                { label: 'Upload - cancelled', value: 'video.upload.cancelled' },
                { label: 'Asset - created', value: 'video.asset.created' },
                { label: 'Asset - ready', value: 'video.asset.ready' },
              ],
              uniforms: {
                label: 'Latest status',
                component: 'MuiReactSelectField'
              }
            },
            lastEventData: {
              type: 'object',
              properties: {}
            },
            pastEvents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {}
              },
            },
          }
        },
        icon: 'fas fa-video',
        displayName: 'MUX Videos',
        tableFields: [
          { label: 'File name', name: 'name' },
          { label: 'Playback id', name: 'lastEventData.playback_ids.0.id', columnRenderType: 'chips', },
          {
            label: 'Latest status', name: 'lastEventType', columnRenderType: 'chips-lookup', lookup: {
              'video.upload.asset_created': 'Upload - asset created',
              'video.upload.created': 'Upload - created',
              'video.upload.cancelled': 'Upload - cancelled',
              'video.asset.created': 'Asset - created',
              'video.asset.ready': 'Asset - ready',
            }
          },
          { label: 'Created', name: 'createdAt', columnRenderType: 'date-time' },
          { label: 'Updated', name: 'updatedAt', columnRenderType: 'date-time' },
        ],
        requiredPrivileges: this.settings.requiredPrivileges,
      }
    },
    createUploadUrl(ctx) {
      const { policy = 'signed', name } = (ctx.params || {})
      let id = null

      return this.actions.create({ name })
        .then(({ _id }) => this.checkItemStatusAndUpdate({
          eventType: 'mux-service.create-upload-url.called',
          id: _id
        }))
        .then(({ _id }) => (
          Video.Uploads.create({
            cors_origin: API_URL,
            new_asset_settings: {
              passthrough: _id,
              playback_policy: policy
            }
          })
            .catch((error) => {
              this.logger.error(error.message)
              this.checkItemStatusAndUpdate({
                eventType: 'mux-service.create-upload-url.failed',
                eventData: error,
                id
              })
              return Promise.reject(error)
            })
        ))
    },
    async webhooks(ctx) {
      const { type: eventType, data: eventData } = ctx.params

      const knownTypes = [
        'video.upload.asset_created',
        'video.upload.created',
        'video.asset.created',
        'video.asset.ready',
        'video.upload.cancelled',
      ]

      if (knownTypes.includes(eventType)) {
        return await this.checkItemStatusAndUpdate({ eventType, eventData })
      }

      this.logger.warn(`mux-service heard unknown event - ${eventType}`)
      this.logger.warn(eventData)
      return
    },
    async token(ctx) {
      const DEFAULT_VALID_TIME = 15 * 60 * 1000
      const { id, aud = 'v' } = ctx.params

      let validTime = DEFAULT_VALID_TIME

      try {
        const [item] = await this.broker.call('mux.find', { query: { 'lastEventData.playback_ids.0.id': id } })
        const durationSeconds = item && item.lastEventData && item.lastEventData.duration
        const durationMilliseconds = (Number(durationSeconds) * 1000) || 0
        validTime = DEFAULT_VALID_TIME + durationMilliseconds
      } catch (error) {
        this.logger.warn(`Cant find mux video duration when generating token, using default - ${DEFAULT_VALID_TIME}!`)
      }

      const privateKey = Buffer.from(MUX_PRIVATE_KEY, 'base64').toString('ascii')

      const payload = {
        sub: id,
        exp: Date.now() + validTime,
        kid: MUX_KID,
        aud
      }

      const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' })

      this.logger.info(`Generated token for playback url - ${id} valid for - ${validTime}!`)

      return token
    }
  },

  methods: {
    getItem(id) {
      return this.broker.call('mux.get', { id })
    },
    updateItem({ item, eventType, eventData }) {
      return this.broker.call('mux.update', {
        id: item._id,
        lastEventData: eventData,
        lastEventType: eventType,
        pastEvents: [
          ...(item && item.pastEvents || []),
          { date: new Date(), eventType, eventData }
        ],
      })
    },
    async checkItemStatusAndUpdate({ eventType, eventData, id: idFromPrams }) {
      const id = idFromPrams || eventData.passthrough || eventData.new_asset_settings.passthrough
      const item = await this.getItem(id)
      if (_.get(item, 'asset.status') !== 'video.asset.ready') {
        return await this.updateItem({ item, eventType, eventData })
      }
      return item
    }
  },

}