'use strict'

const errors = require('../../../errors')
const feature = 'comments'

const {
  getComments: getCommentsSchema,
  getCommentInfo: getCommentInfoSchema,
  addComment: addCommentSchema,
  updCommentVisible: updCommentVisibleSchema,
  delComment: delCommentSchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)
  fastify.get('/', {schema: getCommentsSchema}, getCommentsHandler)
  fastify.get('/:comid', {schema: getCommentInfoSchema}, getCommentInfoHandler)
  fastify.post('/', {schema: addCommentSchema}, addCommentHandler)
  fastify.put(
    '/:comid/visible',
    {schema: updCommentVisibleSchema},
    updCommentVisibleHandler
  )
  fastify.delete('/:comid', {schema: delCommentSchema}, delCommentHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'commentService']
  }
}

async function getCommentsHandler(req, reply) {
  const {autz, query, params} = req
  return await this.commentService.videoComments({autz, params, query})
}

async function getCommentInfoHandler(req, reply) {
  const {autz, params} = req

  const info = await this.commentService.commentInfo({autz, params})
  if (info) {
    reply.code(200).send(info)
  } else {
    reply.code(404).send()
  }
}

async function addCommentHandler(req, reply) {
  const {autz, params} = req
  const {cid, uuid} = params
  let url = req.raw.url
  let comment = {...req.body, cid, uuid}

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }

  const newComment = await this.commentService.addComment({autz, comment})
  reply.code(201).header('Location', `${url}${newComment}`).send()
}

async function updCommentVisibleHandler(req, reply) {
  const {autz, params, body} = req
  const {cid, uuid, comid} = params
  const {value} = body
  const comment = {value, cid, uuid, comid}

  const updated = await this.commentService.updMessageVisible({autz, comment})
  const _code = updated === 1 ? 200 : 404
  reply.code(_code).send()
}

async function delCommentHandler(req, reply) {
  const {autz, params} = req
  const {cid, uuid, comid} = params
  const comment = {cid, uuid, comid}

  const deleted = await this.commentService.delComment({autz, comment})

  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}
