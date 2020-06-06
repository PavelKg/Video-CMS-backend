'use strict'

const errors = require('../errors')
const feature = 'messages'

const {
  message: messageSchema,
  getUserMessages: getUserMessagesSchema,
  getMessagesReceivers: getMessagesReceiversSchema,
  addMessage: addMessageSchema,
  delMessage: delMessageSchema,
  starMessage: starMessageSchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)

  fastify.get(
    '/:direction',
    {schema: getUserMessagesSchema},
    getUserMessagesHandler
  )
  fastify.get(
    '/receivers',
    {schema: getMessagesReceiversSchema},
    getMessagesReceiversHandler
  )
  fastify.post('/', {schema: addMessageSchema}, addMessageHandler)
  fastify.delete(
    '/:direction/:mid',
    {schema: delMessageSchema},
    delMessageHandler
  )
  fastify.post('/:mid/star', {schema: starMessageSchema}, addStarMessageHandler)
  fastify.delete(
    '/:mid/star',
    {schema: starMessageSchema},
    delStarMessageHandler
  )
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'messageService']
  }
}

async function getUserMessagesHandler(req, reply) {
  const {query, params, autz} = req
  const {direction} = params
  return await this.messageService.userMessages({autz, query, direction})
}

async function getMessagesReceiversHandler(req, reply) {
  const {query, autz} = req
  return await this.messageService.userMessagesReceivers({autz, query})
}

async function addMessageHandler(req, reply) {
  let url = req.raw.url
  const {autz, body} = req
  const message = {...body}

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const newMessage = await this.messageService.addMessage({autz, message})
  reply.code(201).header('Location', `${url}${newMessage}`).send()
}

async function delMessageHandler(req, reply) {
  const {params, autz} = req
  const {direction, mid} = params
  const deleted = await this.messageService.delMessage({autz, mid, direction})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}

async function addStarMessageHandler(req, reply) {
  const {params, autz} = req
  const {mid} = params
  let url = req.raw.url

  await this.messageService.addStarredMessage({autz, mid})
  reply.code(201).header('Location', `${url}`).send()
}

async function delStarMessageHandler(req, reply) {
  const {params, autz} = req
  const {mid} = params

  const unstarred = await this.messageService.delStarredMessage({autz, mid})
  const _code = unstarred === 1 ? 204 : 404
  reply.code(_code).send()
}
