'use strict'

const errors = require('../../errors')
const feature = 'groups'

const {
  group: groupSchema,
  getCompanyGroups: getCompanyGroupsSchema,
  getCompanyGroupById: getCompanyGroupByIdSchema,
  getCompanyGroupsParents: getCompanyGroupsParentsSchema,
  getGroupsBindingSeries: getGroupsBindingSeriesSchema,
  addGroup: addGroupSchema,
  updGroup: updGroupSchema,
  delGroupSeries: delGroupSeriesSchema,
  delGroupSeries: addGroupSeriesSchema,
  delGroup: delGroupSchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)

  fastify.get('/', {schema: getCompanyGroupsSchema}, getCompanyGroupsHandler)
  fastify.get(
    '/parents',
    {schema: getCompanyGroupsParentsSchema},
    getCompanyGroupsParentsHandler
  )
  fastify.get(
    '/:gid',
    {schema: getCompanyGroupByIdSchema},
    getCompanyGroupsByIdHandler
  )
  fastify.get(
    '/bind-series/:sid',
    {schema: getGroupsBindingSeriesSchema},
    getGroupsBindingSeriesHandler
  )
  fastify.post('/', {schema: addGroupSchema}, addGroupHandler)
  fastify.put('/:gid', {schema: updGroupSchema}, updGroupHandler)
  fastify.put(
    '/:gid/delete-series/:sid',
    {schema: delGroupSeriesSchema},
    delGroupSeriesHandler
  )
  fastify.put(
    '/:gid/add-series/:sid',
    {schema: addGroupSeriesSchema},
    addGroupSeriesHandler
  )
  fastify.delete('/:gid', {schema: delGroupSchema}, delGroupHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'groupService']
  }
}

async function getCompanyGroupsHandler(req, reply) {
  const {query, params, autz} = req
  const {cid} = params

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  return await this.groupService.companyGroups({autz, cid, query})
}

async function getCompanyGroupsParentsHandler(req, reply) {
  const {query, params, autz} = req
  const {cid} = params

  return await this.groupService.companyGroupsParents({autz, cid, query})
}

async function getCompanyGroupsByIdHandler(req, reply) {
  const {params, autz} = req
  const {cid, gid} = params

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const groups = await this.groupService.companyGroupById({autz, cid, gid})
  const _code = groups.length === 1 ? 200 : 404
  reply.code(_code).send(groups[0])
}

async function addGroupHandler(req, reply) {
  const {params, autz} = req
  const {cid} = params
  let url = req.raw.url
  const group = {...req.body, cid}

  const act = 'add'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const newGroup = await this.groupService.addGroup({autz, group})
  reply.code(201).header('Location', `${url}${newGroup}`).send()
}

async function updGroupHandler(req, reply) {
  const {params, autz} = req
  const {cid, gid} = params
  let group = {...req.body, cid, gid}

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.groupService.updGroup({autz, group})
  const _code = updated === 1 ? 200 : 404
  reply.code(_code).send()
}

async function delGroupSeriesHandler(req, reply) {
  const {params, autz} = req
  const {cid, gid, sid} = params
  let group = {cid, gid, sid}

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.groupService.delGroupSeries({autz, group})
  const _code = updated === 1 ? 204 : 404
  reply.code(_code).send()
}

async function addGroupSeriesHandler(req, reply) {
  const {params, autz} = req
  const {cid, gid, sid} = params
  let group = {cid, gid, sid}

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.groupService.addGroupSeries({autz, group})
  const _code = updated === 1 ? 204 : 404
  reply.code(_code).send()
}

async function delGroupHandler(req, reply) {
  const {params, autz} = req
  const {cid, gid} = params
  let group = {cid, gid}

  const act = 'delete'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const deleted = await this.groupService.delGroup({autz, group})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}

async function getGroupsBindingSeriesHandler(req, reply) {
  const {params, autz} = req
  const {cid, sid} = params

  const groups = await this.groupService.groupsBindedWithSeries({autz, cid, sid})
  const _code = groups.length > 0 ? 200 : 404
  reply.code(_code).send(groups)
}
