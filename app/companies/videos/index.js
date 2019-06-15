'use strict'

const {
  //gcsUploadSignedPolicy: gcsUploadSignedPolicySchema,
  gcsUploadSignedUrl: gcsUploadSignedUrlSchema,
  getVideosCatalog: getVideosCatalogSchema,
  getVideo: getVideoSchema,
  delVideo: delVideoSchema,
  updVideo: updVideoSchema
} = require('./schemas')

module.exports = async function(fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)
  fastify.get(
    '/catalog',
    {schema: getVideosCatalogSchema},
    getVideoCatalogHandler
  )
  fastify.get('/:uuid', {schema: getVideoSchema}, getVideoHandler)
  fastify.delete('/:uuid', {schema: delVideoSchema}, delVideoHandler)
  fastify.put('/:uuid', {schema: updVideoSchema}, updVideoHandler)
  fastify.get(
    '/gcs-upload-surl',
    {schema: gcsUploadSignedUrlSchema},
    gcsUploadSignedUrlHandler
  )
  // fastify.get(
  //   '/gcs-upload-spolicy',
  //   {schema: gcsUploadSignedPolicySchema},
  //   gcsUploadSignedPolicyHandler
  // )
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreHandler', 'videoService']
  }
}

async function gcsUploadSignedUrlHandler(req, reply) {
  const query = req.query

  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })
  return await this.videoService.videosGcsUploadSignedUrl({acc, query})
}

// async function gcsUploadSignedPolicyHandler(req, reply) {
//   const query = req.query

//   let acc = null
//   req.jwtVerify(function(err, decoded) {
//     if (!err) {
//       acc = decoded.user
//     }
//   })
//   return await this.videoService.videosGcsUploadSignedUrl({acc, query})
// }

async function getVideoCatalogHandler(req, reply) {
  const query = req.query

  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })
  return await this.videoService.videosCatalog({acc, query})
}

async function getVideoHandler(req, reply) {
  const {cid, uuid} = req.params

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  return await this.videoService.getVideo({acc, cid, uuid})
}

async function delVideoHandler(req, reply) {
  const {cid, uuid} = req.params

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const deleted = await this.videoService.delVideo({acc, cid, uuid})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}

async function updVideoHandler(req, reply) {
  const {cid, uuid} = req.params
  const data = {...req.body, cid, uuid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const updated = await this.videoService.updVideo({acc, data})
  const _code = updated === 1 ? 200 : 404
  reply.code(_code).send()
}
