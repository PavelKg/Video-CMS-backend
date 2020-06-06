'use strict'
const errors = require('../../errors')
const feature = 'videos'

const {
  //gcsUploadSignedPolicy: gcsUploadSignedPolicySchema,
  gcsUploadSignedUrl: gcsUploadSignedUrlSchema,
  getVideosCatalog: getVideosCatalogSchema,
  getVideo: getVideoSchema,
  getVideoThumbnail: getVideoThumbnailSchema,
  getVideoBindingSeries: getVideoBindingSeriesSchema,
  getVideoBindingGroup: getVideoBindingGroupSchema,
  delVideo: delVideoSchema,
  updVideo: updVideoSchema,
  updVideoStatus: updVideoStatusSchema,
  updVideoPublicStatus: updVideoPublicStatusSchema,
  addVideoPlayerEvent: addVideoPlayerEventShema,
  delVideoSeries: delVideoSeriesSchema,
  delVideoSeries: addVideoSeriesSchema,
  delVideoGroup: delVideoGroupSchema,
  delVideoGroup: addVideoGroupSchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)

  fastify.get(
    '/catalog',
    {schema: getVideosCatalogSchema},
    getVideoCatalogHandler
  )
  fastify.get('/:uuid', {schema: getVideoSchema}, getVideoHandler)
  fastify.get(
    '/:uuid/thumbnail',
    {schema: getVideoThumbnailSchema},
    getVideoThumbnailHandler
  )
  fastify.delete('/:uuid', {schema: delVideoSchema}, delVideoHandler)
  fastify.put('/:uuid', {schema: updVideoSchema}, updVideoHandler)
  fastify.put(
    '/:uuid/delete-series/:sid',
    {schema: delVideoSeriesSchema},
    delVideoSeriesHandler
  )
  fastify.put(
    '/:uuid/add-series/:sid',
    {schema: addVideoSeriesSchema},
    addVideoSeriesHandler
  )

  fastify.put(
    '/:uuid/delete-group/:gid',
    {schema: delVideoGroupSchema},
    delVideoGroupHandler
  )
  fastify.put(
    '/:uuid/add-group/:gid',
    {schema: addVideoGroupSchema},
    addVideoGroupHandler
  )

  fastify.put(
    '/:uuid/status',
    {schema: updVideoStatusSchema},
    updVideoStatusHandler
  )
  fastify.post(
    '/:uuid/player-event',
    {schema: addVideoPlayerEventShema},
    addVideoPlayerEventHandler
  )
  fastify.put(
    '/:uuid/public',
    {schema: updVideoPublicStatusSchema},
    updVideoPublicStatusHandler
  )
  fastify.get(
    '/gcs-upload-surl',
    {schema: gcsUploadSignedUrlSchema},
    gcsUploadSignedUrlHandler
  )
  fastify.get(
    '/bind-series/:sid',
    {schema: getVideoBindingSeriesSchema},
    getVideoBindingSeriesHandler
  )
  fastify.get(
    '/bind-group/:gid',
    {schema: getVideoBindingGroupSchema},
    getVideoBindingGroupHandler
  )

  // fastify.get(
  //   '/gcs-upload-spolicy',
  //   {schema: gcsUploadSignedPolicySchema},
  //   gcsUploadSignedPolicyHandler
  // )
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'videoService']
  }
}

async function gcsUploadSignedUrlHandler(req, reply) {
  const {query, autz} = req
  const act = 'upload'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  return await this.videoService.videosGcsUploadSignedUrl({autz, query})
}

// async function gcsUploadSignedPolicyHandler(req, reply) {
//   const {query, autz} = req
//   return await this.videoService.videosGcsUploadSignedUrl({autz, query})
// }

async function getVideoCatalogHandler(req, reply) {
  const {query, autz} = req
  return await this.videoService.videosCatalog({autz, query})
}

async function getVideoHandler(req, reply) {
  const {cid, uuid} = req.params
  const {autz} = req

  const videos = await this.videoService.getVideo({autz, cid, uuid})
  const _code = videos.length === 1 ? 200 : 404
  reply.code(_code).send(videos[0])
}

async function getVideoThumbnailHandler(req, replay) {
  const {cid, uuid} = req.params
  const {autz} = req

  return await this.videoService.getVideoThumbnail({autz, cid, uuid})
}

async function getVideoBindingSeriesHandler(req, replay) {
  const {cid, sid} = req.params
  const {autz} = req

  return await this.videoService.videosBindedWithSeries({autz, cid, sid})
}

async function getVideoBindingGroupHandler(req, replay) {
  const {cid, gid} = req.params
  const {autz} = req

  return await this.videoService.videosBindedWithGroup({autz, cid, gid})
}

async function delVideoHandler(req, reply) {
  const {cid, uuid} = req.params
  const {autz} = req

  const act = 'delete'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const deleted = await this.videoService.delVideo({autz, cid, uuid})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}

async function updVideoHandler(req, reply) {
  const {cid, uuid} = req.params
  const data = {...req.body, cid, uuid}
  const {autz} = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.videoService.updVideo({autz, data})
  const _code = updated === 1 ? 200 : 404
  reply.code(_code).send()
}

async function delVideoSeriesHandler(req, reply) {
  const {cid, uuid, sid} = req.params
  const video = {cid, uuid, sid}
  const {autz} = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.videoService.delVideoSeries({autz, video})
  const _code = updated === 1 ? 204 : 404
  reply.code(_code).send()
}

async function addVideoSeriesHandler(req, reply) {
  const {cid, uuid, sid} = req.params
  const video = {cid, uuid, sid}
  const {autz} = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.videoService.addVideoSeries({autz, video})
  const _code = updated === 1 ? 204 : 404
  reply.code(_code).send()
}

async function delVideoGroupHandler(req, reply) {
  const {cid, uuid, gid} = req.params
  const video = {cid, uuid, gid}
  const {autz} = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.videoService.delVideoGroup({autz, video})
  const _code = updated === 1 ? 204 : 404
  reply.code(_code).send()
}

async function addVideoGroupHandler(req, reply) {
  const {cid, uuid, gid} = req.params
  const video = {cid, uuid, gid}
  const {autz} = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.videoService.addVideoGroup({autz, video})
  const _code = updated === 1 ? 204 : 404
  reply.code(_code).send()
}

async function updVideoStatusHandler(req, reply) {
  const {cid, uuid} = req.params
  const data = {...req.body, cid, uuid}
  const {autz} = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.videoService.updVideoStatus({autz, data})

  const file_ext = updated[0].video_filename.match(/\.(\w+)$/i)
  if (data.value === 'uploaded') {
    this.bitmovinService.videoEncode(cid, uuid, file_ext[1]).then(
      (res) => {
        const {path_to_manifest, path_to_thumbnail} = res
        this.videoService.updVideoOutputFile({
          cid,
          uuid,
          path_to_manifest,
          path_to_thumbnail
        })
      },
      (error) => {
        console.log('videoEncode error: ', error)
      }
    )
  }

  const _code = updated.length === 1 ? 200 : 404
  reply.code(_code).send()
}

async function updVideoPublicStatusHandler(req, reply) {
  const {cid, uuid} = req.params
  const data = {...req.body, cid, uuid}
  const {autz} = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.videoService.updVideoPublicStatus({autz, data})
  const _code = updated === 1 ? 200 : 404
  reply.code(_code).send()
}

async function addVideoPlayerEventHandler(req, reply) {
  const {cid, uuid} = req.params
  const data = {...req.body, cid, uuid}
  const {autz} = req

  await this.videoService.addPlayerEvent({autz, data})
  reply.code(204).send()
}
