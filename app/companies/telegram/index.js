'use strict'

const errors = require('../../errors')
const feature = 'telegram'

const {
  loginAuth: loginAuthSchema,
  deeplinkAuth: deeplinkAuthSchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!

  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)

  fastify.post(
    '/login-auth/:botname',
    {schema: loginAuthSchema},
    loginAuthHandler
  )
  fastify.get(
    '/deeplink-auth/:botname',
    {schema: deeplinkAuthSchema},
    deeplinkAuthHandler
  )
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'telegramService']
  }
}

async function loginAuthHandler(req, reply) {
  const {body, params, autz} = req
  const {cid, botname} = params

  await this.telegramService.loginAuth({autz, cid, body, botname})
  reply.code(201).send()
}

async function deeplinkAuthHandler(req, reply) {
  const {params, autz} = req
  const {cid, botname} = params

  const {botname: urlBotname, token} = await this.telegramService.deeplinkAuth({
    autz,
    cid,
    botname
  })
  const url = `https://t.me/${urlBotname}?start=${token}`
  reply.code(200).send({url})
}
