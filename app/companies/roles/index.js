'use strict'

const errors = require('../../errors')
const feature = 'roles'

const {
  role: roleSchema,
  getFeatures: getFeaturesSchema,
  getCompanyRoles: getCompanyRolesSchema,
  getCompanyRoleById: getCompanyRoleByIdSchema,
  addRole: addRoleSchema,
  updRole: updRoleSchema,
  delRole: delRoleSchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)

  fastify.get('/features', {schema: getFeaturesSchema}, getFeaturesHandler)
  fastify.get('/', {schema: getCompanyRolesSchema}, getCompanyRolesHandler)
  fastify.get(
    '/:rid',
    {schema: getCompanyRoleByIdSchema},
    getCompanyRoleByIdHandler
  )
  fastify.post('/', {schema: addRoleSchema}, addRoleHandler)
  fastify.put('/:rid', {schema: updRoleSchema}, updRoleHandler)
  fastify.delete('/:rid', {schema: delRoleSchema}, delRoleHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'roleService']
  }
}

async function getCompanyRolesHandler(req, reply) {
  const {query, params, autz} = req
  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const {cid} = params
  return await this.roleService.companyRoles({autz, cid, query})
}

async function getCompanyRoleByIdHandler(req, reply) {
  const {params, autz} = req
  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const {cid, rid} = params
  const role = await this.roleService.companyRoleById({autz, cid, rid})
  const _code = role.length === 1 ? 200 : 404
  reply.code(_code).send(role[0])
}

async function getFeaturesHandler(req, reply) {
  const {params, autz} = req
  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const {cid} = params
  return await this.roleService.features({autz, cid})
}

async function addRoleHandler(req, reply) {
  const {params, raw, body, autz} = req
  const act = 'add'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const {cid} = params
  let url = raw.url
  let role = {...body, cid}

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const newRole = await this.roleService.addRole({autz, role})
  reply.code(201).header('Location', `${url}${newRole}`).send()
}

async function updRoleHandler(req, reply) {
  const {params, body, autz} = req
  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const {cid, rid} = params
  let role = {...body, cid, rid}

  const updated = await this.roleService.updRole({autz, role})
  const _code = updated === 1 ? 200 : 404
  reply.code(_code).send()
}

async function delRoleHandler(req, reply) {
  const {params, autz} = req
  const act = 'delete'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const {cid, rid} = params
  let role = {cid, rid}
  const deleted = await this.roleService.delRole({autz, role})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}
