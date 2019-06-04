'use strict'

const {
  gcsUploadSignedPolicy: gcsUploadSignedPolicySchema,
  gcsUploadSignedUrl: gcsUploadSignedUrlSchema
} = require('./schemas')

module.exports = async function(fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)
  fastify.get(
    '/gcs-upload-surl',
    {schema: gcsUploadSignedUrlSchema},
    gcsUploadSignedUrlHandler
  )
  fastify.get(
    '/gcs-upload-spolicy',
    {schema: gcsUploadSignedPolicySchema},
    gcsUploadSignedPolicyHandler
  )
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

async function gcsUploadSignedPolicyHandler(req, reply) {
  const query = req.query

  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })
  return await this.videoService.videosGcsUploadSignedUrl({acc, query})
}
