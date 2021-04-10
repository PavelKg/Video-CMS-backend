'use strict'

const errors = require('../../../errors')
const feature = 'courses-section'

const {
  getCoursesSectios: getCoursesSectionsSchema,
  getCoursesSectionById: getCoursesSectionByIdSchema,
  //getGroupsBindingSeries: getGroupsBindingSeriesSchema,
  addCoursesSection: addCoursesSectionSchema,
  updCoursesSection: updCoursesSectionSchema,
  delCoursesSection: delCoursesSectionSchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)

  fastify.get(
    '/',
    {schema: getCoursesSectionsSchema},
    getCoursesSectionsHandler
  )
  fastify.get(
    '/:secid',
    {schema: getCoursesSectionByIdSchema},
    getCoursesSectionByIdHandler
  )
  fastify.post('/', {schema: addCoursesSectionSchema}, addCoursesSectionHandler)
  fastify.put(
    '/:secid',
    {schema: updCoursesSectionSchema},
    updCoursesSectionHandler
  )
  fastify.delete(
    '/:secid',
    {schema: delCoursesSectionSchema},
    delCoursesSectionHandler
  )
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'coursesSectionService']
  }
}

async function getCoursesSectionsHandler(req, reply) {
  const {query, params, autz} = req
  const {cid} = params

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  return await this.coursesSectionService.coursesSections({autz, cid, query})
}

async function getCoursesSectionByIdHandler(req, reply) {
  const {params, autz} = req
  const {cid, secid} = params

  const permits = autz.permits
  const reqAccess = feature

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const section = await this.coursesSectionService.coursesSectionById({
    autz,
    cid,
    secid
  })
  const code = section.length === 1 ? 200 : 404
  reply.code(code).send(section[0])
}

async function addCoursesSectionHandler(req, reply) {
  const {params, autz} = req
  const {cid} = params
  let url = req.raw.url
  const section = {...req.body, cid}

  const act = 'add'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const newSection = await this.coursesSectionService.addSection({
    autz,
    section
  })
  reply.code(201).header('Location', `${url}${newSection}`).send()
}

async function updCoursesSectionHandler(req, reply) {
  const {params, autz} = req
  const {cid, secid} = params
  const section = {...req.body, cid, secid}

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.coursesSectionService.updSection({autz, section})
  const code = updated === 1 ? 200 : 404
  reply.code(code).send()
}

async function delCoursesSectionHandler(req, reply) {
  const {params, autz} = req
  const {cid, secid} = params
  const section = {cid, secid}

  const act = 'delete'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const deleted = await this.coursesSectionService.delSection({autz, section})
  const code = deleted === 1 ? 204 : 404
  reply.code(code).send()
}
