'use strict'

const {
  message: messageSchema,
  getUserMessages: getUserMessagesSchema,
  getMessagesReceivers: getMessagesReceiversSchema,
  addMessage: addMessageSchema,
  delMessage: delMessageSchema,
  starMessage: starMessageSchema
} = require('./schemas')

module.exports = async function(fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)

  fastify.get('/:direction', {schema: getUserMessagesSchema}, getUserMessagesHandler)
  fastify.get(
    '/receivers',
    {schema: getMessagesReceiversSchema},
    getMessagesReceiversHandler
  )
  fastify.post('/', {schema: addMessageSchema}, addMessageHandler)
  fastify.delete('/:direction/:mid', {schema: delMessageSchema}, delMessageHandler)
  fastify.post('/:mid/star', {schema: starMessageSchema}, addStarMessageHandler)
  fastify.delete(
    '/:mid/star',
    {schema: starMessageSchema},
    delStarMessageHandler
  )
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreHandler', 'messageService']
  }
}

async function getUserMessagesHandler(req, reply) {
  
  const {direction} = req.params
  const query = req.query
  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })
  return await this.messageService.userMessages({acc, query, direction})
}

async function getMessagesReceiversHandler(req, reply) {
  const query = req.query
  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })
  return await this.messageService.userMessagesReceivers({acc, query})
}

async function addMessageHandler(req, reply) {
  let url = req.raw.url
  const message = {...req.body}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const newMessage = await this.messageService.addMessage({acc, message})
  reply
    .code(201)
    .header('Location', `${url}${newMessage}`)
    .send()
}

async function delMessageHandler(req, reply) {
  const {direction, mid} = req.params

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const deleted = await this.messageService.delMessage({acc, mid, direction})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}

async function addStarMessageHandler(req, reply) {
  const {mid} = req.params
  let url = req.raw.url

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  await this.messageService.addStarredMessage({acc, mid})
  reply
    .code(201)
    .header('Location', `${url}`)
    .send()
}

async function delStarMessageHandler(req, reply) {
  const {mid} = req.params

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const unstarred = await this.messageService.delStarredMessage({acc, mid})
  const _code = unstarred === 1 ? 204 : 404
  reply.code(_code).send()
}
