'use strict'

const {
  group: groupSchema,
  getCompanyGroups: getCompanyGroupsSchema,
  addGroup: addGroupSchema,
  updGroup: updGroupSchema,
  delGroup: delGroupSchema
} = require('./schemas')

module.exports = async function(fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)

  fastify.get('/', {schema: getCompanyGroupsSchema}, getCompanyGroupsHandler)
  fastify.post('/', {schema: addGroupSchema}, addGroupHandler)
  fastify.put('/:gid', {schema: updGroupSchema}, updGroupHandler)
  fastify.delete('/:gid', {schema: delGroupSchema}, delGroupHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreHandler', 'groupService']
  }
}

async function getCompanyGroupsHandler(req, reply) {
  const cid = req.params.cid
  const query =  req.query
  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  return await this.groupService.companyGroups({acc, cid, query})
}

async function addGroupHandler(req, reply) {
  const cid = +req.params.cid
  let url = req.raw.url
  const group = {...req.body, cid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const newGroup = await this.groupService.addGroup({acc, group})
  reply
    .code(201)
    .header('Location', `${url}${newGroup}`)
    .send()
}

async function updGroupHandler(req, reply) {
  const {cid, gid} = req.params
  let group = {...req.body, cid: +cid, gid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const updated = await this.groupService.updGroup({acc, group})
  const _code = updated === 1 ? 200 : 404
  reply.code(_code).send()
}

async function delGroupHandler(req, reply) {
  const {cid, gid} = req.params
  let group = {cid: +cid, gid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const deleted = await this.groupService.delGroup({acc, group})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}
