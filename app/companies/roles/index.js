'use strict'

const {
  role: roleSchema,
  getCompanyRoles: getCompanyRolesSchema,
  addRole: addRoleSchema,
  updRole: updRoleSchema,
  delRole: delRoleSchema
} = require('./schemas')

module.exports = async function(fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)

  fastify.get('/', {schema: getCompanyRolesSchema}, getCompanyRolesHandler)
  fastify.post('/', {schema: addRoleSchema}, addRoleHandler)
  fastify.put('/:rid', {schema: updRoleSchema}, updRoleHandler)
  fastify.delete('/:rid', {schema: delRoleSchema}, delRoleHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreHandler', 'roleService']
  }
}

async function addRoleHandler(req, reply) {
  const cid = +req.params.cid
  let url = req.raw.url
  let role = {...req.body, cid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const newRole = await this.roleService.addRole({acc, role})
  reply
    .code(201)
    .header('Location', `${url}${newRole}`)
    .send()
}

async function updRoleHandler(req, reply) {
  const {cid, rid} = req.params
  let role = {...req.body, cid: +cid, rid}
  

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const updated = await this.roleService.updRole({acc, role})
  const _code = updated === 1 ? 200 : 404
  reply.code(_code).send()
}

async function delRoleHandler(req, reply) {
  const {cid, rid} = req.params
  let role = {cid: +cid, rid}
  
  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const deleted = await this.roleService.delRole({acc, role})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}


async function getCompanyRolesHandler(req, reply) {
  const cid = req.params.cid
  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })
  return await this.roleService.companyRoles({acc, cid})
}
