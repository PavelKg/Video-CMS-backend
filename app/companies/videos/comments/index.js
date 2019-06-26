'use strict'

const {
  getComments: getCommentsSchema,
  addComment: addCommentSchema,
  updCommentVisible: updCommentVisibleSchema,
  delComment: delCommentSchema
} = require('./schemas')

module.exports = async function(fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)
  fastify.get('/', {schema: getCommentsSchema}, getCommentsHandler)
  fastify.post('/', {schema: addCommentSchema}, addCommentsHandler)
  fastify.put(
    '/:comid/visible',
    {schema: updCommentVisibleSchema},
    updCommentVisibleHandler
  )
  fastify.delete('/:comid', {schema: delCommentSchema}, delCommentHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreHandler', 'commentService']
  }
}

async function getCommentsHandler(req, reply) {
  const params = req.params
  const query = req.query

  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })
  return await this.commentService.videoComments({acc, params, query})
}

async function addCommentsHandler(req, reply) {
  const {cid, uuid} = req.params
  let url = req.raw.url
  let comment = {...req.body, cid, uuid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }

  const newComment = await this.commentService.addComment({acc, comment})
  reply
    .code(201)
    .header('Location', `${url}${newComment}`)
    .send()
}

async function updCommentVisibleHandler(req, reply) {
  const {cid, uuid, comid} = req.params
  const {value} = req.body
  const comment = {value, cid, uuid, comid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const updated = await this.commentService.updMessageVisible({acc, comment})
  const _code = updated === 1 ? 200 : 404
  reply.code(_code).send()
}

async function delCommentHandler(req, reply) {
  const {cid, uuid, comid} = req.params
  const comment = {cid, uuid, comid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })
  const deleted = await this.commentService.delComment({acc, comment})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}
