'use strict'

const errors = require('../../../errors')
const feature = 'course-section'

const {
  getCourseSectios: getCourseSectionsSchema,
  getCourseSectionById: getCourseSectionByIdSchema,
  //getGroupsBindingSeries: getGroupsBindingSeriesSchema,
  addCourseSection: addCourseSectionSchema,
  updCourseSection: updCourseSectionSchema,
  delCourseSection: delCourseSectionSchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)

  fastify.get('/', {schema: getCourseSectionsSchema}, getCourseSectionsHandler)
  fastify.get(
    '/:secid',
    {schema: getCourseSectionByIdSchema},
    getCourseSectionByIdHandler
  )
  fastify.post('/', {schema: addCourseSectionSchema}, addCourseSectionHandler)
  fastify.put('/:secid', {schema: updCourseSectionSchema}, updCourseSectionHandler)
  fastify.delete('/:secid', {schema: delCourseSectionSchema}, delCourseSectionHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'courseSectionService']
  }
}

async function getCourseSectionsHandler(req, reply) {
  const {query, params, autz} = req
  const {cid} = params

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  return await this.courseSectionService.courseSections({autz, cid, query})
}

async function getCourseSectionByIdHandler(req, reply) {
  const {params, autz} = req
  const {cid, secid} = params

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const section = await this.courseSectionService.courseSectionById({autz, cid, secid})
  const code = course.length === 1 ? 200 : 404
  reply.code(code).send(section[0])
}

async function addCourseSectionHandler(req, reply) {
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
  const newSection = await this.courseSectionService.addSection({autz, section})
  reply.code(201).header('Location', `${url}${newSection}`).send()
}

async function updCourseSectionHandler(req, reply) {
  const {params, autz} = req
  const {cid, secid} = params
  const section = {...req.body, cid, secid}

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.courseSectionService.updSection({autz, section})
  const code = updated === 1 ? 200 : 404
  reply.code(code).send()
}

async function delCourseSectionHandler(req, reply) {
  const {params, autz} = req
  const {cid, secid} = params
  const section = {cid, secid}

  const act = 'delete'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const deleted = await this.courseSectionService.delSection({autz, section})
  const code = deleted === 1 ? 204 : 404
  reply.code(code).send()
}
