'use strict'

const errors = require('../../errors')
const feature = 'courses'

const {
  getCourses: getCoursesSchema,
  getCourseById: getCourseByIdSchema,
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

  fastify.get('/', {schema: getCoursesSchema}, getCoursesHandler)

  fastify.get('/catalog', {schema: getCoursesSchema}, getCoursesCatalogHandler)
  fastify.get(
    '/in-progress',
    {schema: getCoursesSchema},
    getUsersCoursesHandler
  )
  fastify.get('/completed', {schema: getCoursesSchema}, getUsersCoursesHandler)

  fastify.get('/:name', {schema: getCourseByIdSchema}, getCourseByIdHandler)
  fastify.get(
    '/:name/sections',
    {schema: getCourseSectionsSchema},
    getCourseSectionsHandler
  )

  fastify.put(
    '/:name/sections',
    {schema: updCourseSectionsSchema},
    updCourseSectionsHandler
  )

  fastify.post('/', {schema: addCourseSchema}, addCourseHandler)
  fastify.put('/:name', {schema: updCourseSchema}, updCourseHandler)
  fastify.delete('/:name', {schema: delCourseSchema}, delCourseHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'courseService']
  }
}

async function getCoursesHandler(req) {
  const {query, autz} = req

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  return await this.courseService.courses({autz, query})
}

async function getUsersCoursesHandler(req, reply) {
  const {
    params: {name},
    autz,
    query
  } = req

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  let category = /.*\/(.+)$/.exec(req.routerPath)[1]
  //category = category.charAt(0).toUpperCase() + category.substring(1)

  return await this.courseService.usersCourses({autz, query, category})
}

async function getCoursesCatalogHandler(req, reply) {
  const {
    params: {name},
    autz,
    query
  } = req

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  // let category = /.*\/(.+)$/.exec(req.routerPath)[1]
  // category = category.charAt(0).toUpperCase() + category.substring(1)
  // [`courses${category}`]
  return await this.courseService.coursesCatalog({autz, query})
}

async function getCourseByIdHandler(req, reply) {
  const {
    params: {name},
    autz
  } = req

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const course = await this.courseService.courseById({autz, name})
  const code = course.length === 1 ? 200 : 404
  reply.code(code).send(course[0])
}

async function getCourseSectionsHandler(req, reply) {
  const {
    params: {name},
    autz
  } = req

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const sections = await this.courseService.getCourseSections({autz, name})
  //const code = sections.length > 0 ? 200 : 404
  reply.code(200).send(sections)
}

async function updCourseSectionsHandler(req, reply) {
  const {
    params: {name},
    autz,
    body
  } = req
  const section = {...body, name}

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
  const {autz, body, raw} = req
  let url = raw.url
  const course = {...body}

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
  const {
    params: {name},
    autz,
    body
  } = req

  const course = {...body, name}

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
  const {
    params: {name},
    autz
  } = req

  const act = 'delete'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const deleted = await this.courseService.delCourse({autz, name})
  const code = deleted === 1 ? 204 : 404
  reply.code(code).send()
}
