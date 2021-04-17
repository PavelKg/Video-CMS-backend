'use strict'

const errors = require('../../errors')
const feature = 'courses'

const {
  getCompanyCourses: getCompanyCoursesSchema,
  getCompanyCourseById: getCompanyCourseByIdSchema,
  getCourseSections: getCourseSectionsSchema,
  updCourseSections: updCourseSectionsSchema,
  addCourse: addCourseSchema,
  updCourse: updCourseSchema,
  delCourse: delCourseSchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)

  fastify.get('/', {schema: getCompanyCoursesSchema}, getCompanyCoursesHandler)
  fastify.get(
    '/:crid',
    {schema: getCompanyCourseByIdSchema},
    getCompanyCourseByIdHandler
  )
  fastify.get(
    '/:crid/sections',
    {schema: getCourseSectionsSchema},
    getCourseSectionsHandler
  )

  fastify.put(
    '/:crid/sections',
    {schema: updCourseSectionsSchema},
    updCourseSectionsHandler
  )

  fastify.post('/', {schema: addCourseSchema}, addCourseHandler)
  fastify.put('/:crid', {schema: updCourseSchema}, updCourseHandler)
  fastify.delete('/:crid', {schema: delCourseSchema}, delCourseHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'courseService']
  }
}

async function getCompanyCoursesHandler(req, reply) {
  const {query, params, autz} = req
  const {cid} = params

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  return await this.courseService.companyCourses({autz, cid, query})
}

async function getCompanyCourseByIdHandler(req, reply) {
  const {params, autz} = req
  const {cid, crid} = params

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const course = await this.courseService.companyCourseById({autz, cid, crid})
  const code = course.length === 1 ? 200 : 404
  reply.code(code).send(course[0])
}

async function getCourseSectionsHandler(req, reply) {
  const {params, autz} = req
  const {cid, crid} = params

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const sections = await this.courseService.getCourseSections({autz, cid, crid})
  const code = sections.length > 0 ? 200 : 404
  reply.code(code).send(sections)
}

async function updCourseSectionsHandler(req, reply) {
  const {params, autz} = req
  const {cid, crid} = params
  const section = {...req.body, cid, crid}

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const sections = await this.courseService.updCourseSections({
    autz,
    ...section
  })

  const code = sections.length > 0 ? 200 : 404
  reply.code(code).send()
}

async function addCourseHandler(req, reply) {
  const {params, autz} = req
  const {cid} = params
  let url = req.raw.url
  const course = {...req.body, cid}

  const act = 'add'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const newCourse = await this.courseService.addCourse({autz, course})
  reply.code(201).header('Location', `${url}${newCourse}`).send()
}

async function updCourseHandler(req, reply) {
  const {params, autz} = req
  const {cid, crid} = params
  const course = {...req.body, cid, crid}

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.courseService.updCourse({autz, course})
  const code = updated === 1 ? 200 : 404
  reply.code(code).send()
}

async function delCourseHandler(req, reply) {
  const {params, autz} = req
  const {cid, crid} = params
  const course = {cid, crid}

  const act = 'delete'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const deleted = await this.courseService.delCourse({autz, course})
  const code = deleted === 1 ? 204 : 404
  reply.code(code).send()
}
