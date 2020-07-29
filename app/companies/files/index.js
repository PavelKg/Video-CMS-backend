'use strict'
const errors = require('../../errors')
const feature = 'files'

const {
  //gcsUploadSignedPolicy: gcsUploadSignedPolicySchema,
  gcsUploadSignedUrl: gcsUploadSignedUrlSchema,
  getFilesCatalog: getFilesCatalogSchema,
  getFile: getFileSchema,
  getFileThumbnail: getFileThumbnailSchema,
  getFileBindingSeries: getFileBindingSeriesSchema,
  getFileBindingGroup: getFileBindingGroupSchema,
  delFile: delFileSchema,
  updFile: updFileSchema,
  updFileStatus: updFileStatusSchema,
  updFilePublicStatus: updFilePublicStatusSchema,
  addFilePlayerEvent: addFilePlayerEventShema,
  delFileSeries: delFileSeriesSchema,
  delFileSeries: addFileSeriesSchema,
  delFileGroup: delFileGroupSchema,
  delFileGroup: addFileGroupSchema
} = require('./schemas')
const fastify = require('fastify')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)

  fastify.get(
    '/catalog',
    {schema: getFilesCatalogSchema},
    getFileCatalogHandler
  )
  fastify.get('/:uuid', {schema: getFileSchema}, getFileHandler)
  fastify.get(
    '/:uuid/thumbnail',
    {schema: getFileThumbnailSchema},
    getFileThumbnailHandler
  )
  fastify.delete('/:uuid', {schema: delFileSchema}, delFileHandler)
  fastify.put('/:uuid', {schema: updFileSchema}, updFileHandler)
  fastify.put(
    '/:uuid/delete-series/:sid',
    {schema: delFileSeriesSchema},
    delFileSeriesHandler
  )
  fastify.put(
    '/:uuid/add-series/:sid',
    {schema: addFileSeriesSchema},
    addFileSeriesHandler
  )

  fastify.put(
    '/:uuid/delete-group/:gid',
    {schema: delFileGroupSchema},
    delFileGroupHandler
  )
  fastify.put(
    '/:uuid/add-group/:gid',
    {schema: addFileGroupSchema},
    addFileGroupHandler
  )

  fastify.put(
    '/:uuid/status',
    {schema: updFileStatusSchema},
    updFileStatusHandler
  )
  fastify.post(
    '/:uuid/player-event',
    {schema: addFilePlayerEventShema},
    addFilePlayerEventHandler
  )
  fastify.put(
    '/:uuid/public',
    {schema: updFilePublicStatusSchema},
    updFilePublicStatusHandler
  )
  fastify.get(
    '/gcs-upload-surl',
    {schema: gcsUploadSignedUrlSchema},
    gcsUploadSignedUrlHandler
  )
  fastify.get(
    '/bind-series/:sid',
    {schema: getFileBindingSeriesSchema},
    getFileBindingSeriesHandler
  )
  fastify.get(
    '/bind-group/:gid',
    {schema: getFileBindingGroupSchema},
    getFileBindingGroupHandler
  )

  // fastify.get(
  //   '/gcs-upload-spolicy',
  //   {schema: gcsUploadSignedPolicySchema},
  //   gcsUploadSignedPolicyHandler
  // )
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'fileService']
  }
}

async function gcsUploadSignedUrlHandler(req, reply) {
  const {query, autz} = req
  const act = 'upload'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`

  console.log(permits, {reqAccess})
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  return await this.fileService.filesGcsUploadSignedUrl({autz, query})
}

// async function gcsUploadSignedPolicyHandler(req, reply) {
//   const {query, autz} = req
//   return await this.fileService.filesGcsUploadSignedUrl({autz, query})
// }

async function getFileCatalogHandler(req, reply) {
  const {query, autz} = req
  return await this.fileService.filesCatalog({autz, query})
}

async function getFileHandler(req, reply) {
  const {cid, uuid} = req.params
  const {autz} = req

  const files = await this.fileService.getFile({autz, cid, uuid})
  const _code = files.length === 1 ? 200 : 404
  reply.code(_code).send(files[0])
}

async function getFileThumbnailHandler(req, replay) {
  const {cid, uuid} = req.params
  const {autz} = req

  return await this.fileService.getFileThumbnail({autz, cid, uuid})
}

async function getFileBindingSeriesHandler(req, replay) {
  const {cid, sid} = req.params
  const {autz} = req

  return await this.fileService.filesBindedWithSeries({autz, cid, sid})
}

async function getFileBindingGroupHandler(req, replay) {
  const {cid, gid} = req.params
  const {autz} = req

  return await this.fileService.filesBindedWithGroup({autz, cid, gid})
}

async function delFileHandler(req, reply) {
  const {cid, uuid} = req.params
  const {autz} = req

  const act = 'delete'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const deleted = await this.fileService.delFile({autz, cid, uuid})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}

async function updFileHandler(req, reply) {
  const {cid, uuid} = req.params
  const data = {...req.body, cid, uuid}
  const {autz} = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.fileService.updFile({autz, data})
  const _code = updated === 1 ? 200 : 404
  reply.code(_code).send()
}

async function delFileSeriesHandler(req, reply) {
  const {cid, uuid, sid} = req.params
  const file = {cid, uuid, sid}
  const {autz} = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.fileService.delFileSeries({autz, file})
  const _code = updated === 1 ? 204 : 404
  reply.code(_code).send()
}

async function addFileSeriesHandler(req, reply) {
  const {cid, uuid, sid} = req.params
  const file = {cid, uuid, sid}
  const {autz} = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.fileService.addFileSeries({autz, file})
  const _code = updated === 1 ? 204 : 404
  reply.code(_code).send()
}

async function delFileGroupHandler(req, reply) {
  const {cid, uuid, gid} = req.params
  const file = {cid, uuid, gid}
  const {autz} = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.fileService.delFileGroup({autz, file})
  const _code = updated === 1 ? 204 : 404
  reply.code(_code).send()
}

async function addFileGroupHandler(req, reply) {
  const {cid, uuid, gid} = req.params
  const file = {cid, uuid, gid}
  const {autz} = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.fileService.addFileGroup({autz, file})
  const _code = updated === 1 ? 204 : 404
  reply.code(_code).send()
}

async function updFileStatusHandler(req, reply) {
  const {cid, uuid} = req.params
  const data = {...req.body, cid, uuid}
  const {autz} = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.fileService.updFileStatus({autz, data})

  const file_ext = updated[0].file_filename.match(/\.(\w+)$/i)
  if (data.value === 'uploaded') {
    this.bitmovinService.fileEncode(cid, uuid, file_ext[1]).then(
      (res) => {
        const {path_to_manifest, path_to_thumbnail} = res
        this.fileService.updFileOutputFile({
          cid,
          uuid,
          path_to_manifest,
          path_to_thumbnail
        })
      },
      (error) => {
        console.log('fileEncode error: ', error)
      }
    )
  }

  const _code = updated.length === 1 ? 200 : 404
  reply.code(_code).send()
}

async function updFilePublicStatusHandler(req, reply) {
  const {cid, uuid} = req.params
  const data = {...req.body, cid, uuid}
  const {autz} = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.fileService.updFilePublicStatus({autz, data})
  const _code = updated === 1 ? 200 : 404
  reply.code(_code).send()
}

async function addFilePlayerEventHandler(req, reply) {
  const {cid, uuid} = req.params
  const data = {...req.body, cid, uuid}
  const {autz} = req

  await this.fileService.addPlayerEvent({autz, data})
  reply.code(204).send()
}
