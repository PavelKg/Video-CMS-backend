'use strict'

const errors = require('../../../../errors')
const feature = 'courses-section'

const {
  getCourseModules: getCourseModulesSchema,
  getCourseModuleById: getCourseModuleByIdSchema,
  getCourseModuleLessons: getCourseModuleLessonsSchema,
  updCourseModuleLessons: updCourseModuleLessonsSchema,
  addCourseModule: addCourseModuleSchema,
  updCourseModule: updCourseModuleSchema,
  delCourseModule: delCourseModuleSchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)

  fastify.get('/', {schema: getCourseModulesSchema}, getCourseModulesHandler)
  fastify.get(
    '/:modid',
    {schema: getCourseModuleByIdSchema},
    getCourseModuleByIdHandler
  )

  fastify.get(
    '/:modid/lessons',
    {schema: getCourseModuleLessonsSchema},
    getCourseModuleLessonsHandler
  )

  fastify.put(
    '/:modid/lessons',
    {schema: updCourseModuleLessonsSchema},
    updCourseModuleLessonsHandler
  )

  fastify.post('/', {schema: addCourseModuleSchema}, addCourseModuleHandler)
  fastify.put(
    '/:modid',
    {schema: updCourseModuleSchema},
    updCourseModuleHandler
  )
  fastify.delete(
    '/:modid',
    {schema: delCourseModuleSchema},
    delCourseModuleHandler
  )
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'courseModulesService']
  }
}

async function getCourseModulesHandler(req, reply) {
  const {query, params, autz} = req
  const {cid, crid} = params

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  return await this.courseModulesService.getModules({
    autz,
    cid,
    query,
    crid
  })
}

async function getCourseModuleByIdHandler(req, reply) {
  const {params, autz} = req
  const {cid, modid} = params

  const permits = autz.permits
  const reqAccess = feature

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const module = await this.courseModulesService.getModuleById({
    autz,
    cid,
    modid
  })
  const code = module.length === 1 ? 200 : 404
  reply.code(code).send(module[0])
}

async function getCourseModuleLessonsHandler(req, reply) {
  const {params, autz} = req
  const {cid, modid} = params

  const permits = autz.permits
  const reqAccess = feature

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const lessons = await this.courseModulesService.getModuleLessons({
    autz,
    cid,
    modid
  })
  const code = lessons.length === 1 ? 200 : 404
  reply.code(code).send(lessons[0].module_lessons)
}

async function updCourseModuleLessonsHandler(req, reply) {
  const {params, autz} = req
  const {cid, modid} = params
  const module = {...req.body, cid, modid}

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.courseModulesService.updModuleLessons({autz, module})
  const code = updated === 1 ? 200 : 404
  reply.code(code).send()
}

async function addCourseModuleHandler(req, reply) {
  const {params, autz} = req
  const {cid} = params
  let url = req.raw.url
  const module = {...req.body, cid}

  const act = 'add'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const newModule = await this.courseModulesService.addModule({
    autz,
    module
  })
  reply.code(201).header('Location', `${url}${newModule}`).send()
}

async function updCourseModuleHandler(req, reply) {
  const {params, autz} = req
  const {cid, modid} = params
  const module = {...req.body, cid, modid}

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.courseModulesService.updModule({autz, module})
  const code = updated === 1 ? 200 : 404
  reply.code(code).send()
}

async function delCourseModuleHandler(req, reply) {
  const {params, autz} = req
  const {cid, modid} = params
  const module = {cid, modid}

  const act = 'delete'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const deleted = await this.courseModulesService.delModule({autz, module})
  const code = deleted === 1 ? 204 : 404
  reply.code(code).send()
}
