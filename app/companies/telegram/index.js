'use strict'

const {
  loginAuth: loginAuthSchema,
  deeplinkAuth: deeplinkAuthSchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!

  fastify.addHook('preHandler', fastify.authPreHandler)
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
    fastify: ['authPreHandler', 'telegramService']
  }
}

async function loginAuthHandler(req, reply) {
  const {cid, botname} = req.params
  const body = req.body

  let acc
  req.jwtVerify(function (err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  await this.telegramService.loginAuth({acc, cid, body, botname})
  reply.code(201).send()
}

async function deeplinkAuthHandler(req, reply) {
  const {cid, botname} = req.params

  let acc
  req.jwtVerify(function (err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const {botname: urlBotname, token} = await this.telegramService.deeplinkAuth({
    acc,
    cid,
    botname
  })
  const url = `https://t.me/${urlBotname}?start=${token}`
  reply.code(200).send({url})
}
