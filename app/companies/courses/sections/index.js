'use strict'

const errors = require('../../../errors')
const feature = 'courses'

const {
  getCourseSections: getCourseSectionsSchema,
  getCourseSectionById: getCourseSectionByIdSchema,
  getSectionModules: getSectionModulesSchema,
  updSectionModules: updSectionModulesSchema,
  getCourseSectionsModel: getCourseSectionsModelSchema,
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
    '/model',
    {schema: getCourseSectionsModelSchema},
    getCourseSectionsModelHandler
  )

  fastify.get(
    '/:uuid',
    {schema: getCourseSectionByIdSchema},
    getCourseSectionByIdHandler
  )
  fastify.get(
    '/:uuid/modules',
    {schema: getSectionModulesSchema},
    getSectionModulesHandler
  )
  fastify.put(
    '/:uuid/modules',
    {schema: updSectionModulesSchema},
    updSectionModulesHandler
  )

  fastify.post('/', {schema: addCourseSectionSchema}, addCourseSectionHandler)
  fastify.put(
    '/:uuid',
    {schema: updCourseSectionSchema},
    updCourseSectionHandler
  )
  fastify.delete(
    '/:uuid',
    {schema: delCourseSectionSchema},
    delCourseSectionHandler
  )
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'courseSectionsService']
  }
}

async function getCourseSectionsHandler(req, reply) {
  const {query, params, autz} = req
  const {cid, crid} = params

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  return await this.courseSectionsService.getSections({
    autz,
    cid,
    query,
    crid
  })
}
async function getCourseSectionsModelHandler(req, reply) {
  const {params, autz} = req
  const {cid} = params

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  return await this.courseSectionsService.getSectionsModel({autz, cid})
}

async function getCourseSectionByIdHandler(req, reply) {
  const {params, autz} = req
  const {cid, uuid} = params

  const permits = autz.permits
  const reqAccess = feature

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const section = await this.courseSectionsService.getSectionById({
    autz,
    cid,
    uuid
  })
  const code = section.length === 1 ? 200 : 404
  reply.code(code).send(section[0])
}

async function getSectionModulesHandler(req, reply) {
  const {params, autz} = req
  const {cid, uuid} = params

  const permits = autz.permits
  const reqAccess = feature

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const modules = await this.courseSectionsService.getSectionModules({
    autz,
    cid,
    secid: uuid
  })
  const code = modules.length > 0 ? 200 : 404
  reply.code(code).send(modules)
}

async function updSectionModulesHandler(req, reply) {
  const {params, autz} = req
  const {cid, uuid} = params
  const module = {...req.body, cid, secid: uuid}

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const modules = await this.courseSectionsService.updSectionModules({
    autz,
    ...module
  })

  const code = modules.length > 0 ? 200 : 404
  reply.code(code).send()
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
  const newSection = await this.courseSectionsService.addSection({
    autz,
    section
  })
  reply.code(201).header('Location', `${url}${newSection}`).send()
}

async function updCourseSectionHandler(req, reply) {
  const {params, autz} = req
  const {cid, uuid} = params
  const section = {...req.body, cid, uuid}

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.courseSectionsService.updSection({autz, section})
  const code = updated === 1 ? 200 : 404
  reply.code(code).send()
}

async function delCourseSectionHandler(req, reply) {
  const {params, autz} = req
  const {cid, uuid} = params
  const section = {cid, uuid}

  const act = 'delete'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const deleted = await this.courseSectionsService.delSection({autz, section})
  const code = deleted === 1 ? 204 : 404
  reply.code(code).send()
}
