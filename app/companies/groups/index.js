'use strict'

const {
  group: groupSchema,
  getCompanyGroups: getCompanyGroupsSchema,
  getCompanyGroupById: getCompanyGroupByIdSchema,
  getGroupsBindingSeries: getGroupsBindingSeriesSchema,
  addGroup: addGroupSchema,
  updGroup: updGroupSchema,
  delGroupSeries: delGroupSeriesSchema,
  delGroupSeries: addGroupSeriesSchema,
  delGroup: delGroupSchema
} = require('./schemas')

module.exports = async function(fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)

  fastify.get('/', {schema: getCompanyGroupsSchema}, getCompanyGroupsHandler)
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
    fastify: ['authPreHandler', 'groupService']
  }
}

async function getCompanyGroupsHandler(req, reply) {
  const cid = req.params.cid
  const query = req.query
  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  return await this.groupService.companyGroups({acc, cid, query})
}

async function getCompanyGroupsByIdHandler(req, reply) {
  const {cid, gid} = req.params
  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const groups = await this.groupService.companyGroupById({acc, cid, gid})
  const _code = groups.length === 1 ? 200 : 404
  reply.code(_code).send(groups[0])
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

async function delGroupSeriesHandler(req, reply) {
  const {cid, gid, sid} = req.params
  let group = {cid, gid, sid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const updated = await this.groupService.delGroupSeries({acc, group})
  const _code = updated === 1 ? 204 : 404
  reply.code(_code).send()
}

async function addGroupSeriesHandler(req, reply) {
  const {cid, gid, sid} = req.params
  let group = {cid, gid, sid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const updated = await this.groupService.addGroupSeries({acc, group})
  const _code = updated === 1 ? 204 : 404
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

async function getGroupsBindingSeriesHandler(req, reply) {
  const {cid, sid} = req.params

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const groups = await this.groupService.groupsBindedWithSeries({acc, cid, sid})
  const _code = groups.length > 0 ? 200 : 404
  reply.code(_code).send(groups)
}
