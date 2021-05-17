'use strict'

const errors = require('../../errors')
const feature = 'tests'

const {
  getTests: getTestsSchema,
  getTestById: getTestByIdSchema,
  addTest: addTestSchema,
  updTest: updTestSchema,
  updTestContent: updTestContentSchema,
  delTest: delTestSchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)

  fastify.get('/', {schema: getTestsSchema}, getTestsHandler)
  fastify.get('/:uuid', {schema: getTestByIdSchema}, getTestByIdHandler)
  fastify.post('/', {schema: addTestSchema}, addTestHandler)
  fastify.put('/:uuid', {schema: updTestSchema}, updTestHandler)
  fastify.put(
    '/:uuid/content',
    {schema: updTestContentSchema},
    updTestContentHandler
  )
  fastify.delete('/:uuid', {schema: delTestSchema}, delTestHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'testService']
  }
}

async function getTestsHandler(req, reply) {
  const {query, autz} = req

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  return await this.testService.getTests({
    autz,
    query
  })
}

async function getTestByIdHandler(req, reply) {
  const {
    params: {uuid},
    autz
  } = req

  const permits = autz.permits
  const reqAccess = feature

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const test = await this.testService.getTestById({
    autz,
    uuid
  })

  const code = test.length === 1 ? 200 : 404
  reply.code(code).send(test[0])
}

async function addTestHandler(req, reply) {
  const {autz, raw, body} = req

  let url = raw.url

  const act = 'add'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const res = await this.testService.addTest({
    autz,
    content: body
  })
  reply.code(201).header('Location', `${url}${res}`).send()
}

async function updTestHandler(req, reply) {
  const {
    params: {uuid},
    autz,
    body
  } = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.testService.updTest({
    autz,
    content: {...body, uuid}
  })
  const code = updated === 1 ? 200 : 404
  reply.code(code).send()
}

async function updTestContentHandler(req, reply) {
  const {
    params: {uuid},
    autz,
    body: {content}
  } = req

  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const updated = await this.testService.updTestContent({
    autz,
    content: {uuid, content}
  })
  const code = updated === 1 ? 200 : 404
  reply.code(code).send()
}

async function delTestHandler(req, reply) {
  const {params, autz} = req
  const {uuid} = params

  const act = 'delete'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const deleted = await this.testService.delTest({autz, uuid})
  const code = deleted === 1 ? 204 : 404
  reply.code(code).send()
}
