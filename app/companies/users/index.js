'use strict'

const {
  user: userSchema,
  getCompanyUsers: getCompanyUsersSchema,
  addUser: addUserSchema,
  updUser: updUserSchema,
  delUser: delUserSchema
} = require('./schemas')

module.exports = async function(fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)

  fastify.get('/', {schema: getCompanyUsersSchema}, getCompanyUsersHandler)
  fastify.post('/', {schema: addUserSchema}, addUserHandler)
  fastify.put('/:uid', {schema: updUserSchema}, updUserHandler)
  fastify.delete('/:uid', {schema: delUserSchema}, delUserHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreHandler', 'userService']
  }
}

async function getCompanyUsersHandler(req, reply) {
  const cid = req.params.cid
  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })
  return await this.userService.companyUsers({acc, cid})
}

async function addUserHandler(req, reply) {
  const cid = +req.params.cid
  let url = req.raw.url
  let user = {...req.body, cid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const newUser = await this.userService.addUser({acc, user})
  reply
    .code(201)
    .header('Location', `${url}${newUser}`)
    .send()
}

async function updUserHandler(req, reply) {
  const {cid, uid} = req.params
  let user = {...req.body, cid: +cid, uid}
  

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const updated = await this.userService.updUser({acc, user})
  const _code = updated === 1 ? 200 : 404
  reply.code(_code).send()
}

async function delUserHandler(req, reply) {
  const {cid, uid} = req.params
  let user = {cid: +cid, uid}
  
  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  console.log('acc-=', acc)

  const deleted = await this.userService.delUser({acc, user})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}
