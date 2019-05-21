'use strict'

const {
  message: messageSchema,
  getUserMessages: getUserMessagesSchema,
  getMessagesReceivers: getMessagesReceiversSchema,
  addMessage: addMessageSchema,
  delMessage: delMessageSchema
} = require('./schemas')

module.exports = async function(fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)

  fastify.get('/', {schema: getUserMessagesSchema}, getUserMessagesHandler)
  fastify.get('/receivers', {schema: getMessagesReceiversSchema}, getMessagesReceiversHandler)
  fastify.post('/', {schema: addMessageSchema}, addMessageHandler)
  //fastify.put('/:gid', {schema: updMessageSchema}, updMessageHandler)
  fastify.delete('/:mid', {schema: delMessageSchema}, delMessageHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreHandler', 'messageService']
  }
}

async function getUserMessagesHandler(req, reply) {
  const query =  req.query
  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })
  return await this.messageService.userMessages({acc, query})
}

async function getMessagesReceiversHandler(req, reply) {
  const query =  req.query
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
  const {mid} = req.params
  let message = {mid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const deleted = await this.messageService.delMessage({acc, message})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}
