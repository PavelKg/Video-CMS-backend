'use strict'
const feature = 'history'
const errors = require('../errors')

const {
  historyInfo: historyInfoSchema,
  historyCategories: historyCategoriesSchema,
  historyCategoryObjects: historyCategoryObjectsSchema,
  historyCategoryObjectsByName: historyCategoryObjectsByNameSchema
  //addUserActivity: addUserActivitySchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)

  fastify.get('/', {schema: historyInfoSchema}, getHistoryInfoHandler)
  fastify.get(
    '/categories',
    {schema: historyCategoriesSchema},
    historyCategoriesHandler
  )
  fastify.get(
    '/categories/objects',
    {schema: historyCategoryObjectsSchema},
    historyCategoryObjectsHandler
  )
  fastify.get(
    '/categories/:cname/objects',
    {schema: historyCategoryObjectsByNameSchema},
    historyCategoryObjectsByNameHandler
  )
  // fastify.post(
  //   '/companies/:cid/uid/:uid',
  //   {schema: addUserActivitySchema},
  //   addUserActivityHandler
  // )
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'histLoggerService']
  }
}

async function getHistoryInfoHandler(req, reply) {
  const {autz, query} = req

  const act = 'browse'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  return await this.histLoggerService.getHistoryInfo({autz, query})
}

async function historyCategoriesHandler(req, reply) {
  const {autz, query} = req
  const categories = await this.histLoggerService.getHistoryCategories({
    autz,
    query
  })
  return categories
}

async function historyCategoryObjectsHandler(req, reply) {
  const {autz, query} = req
  const result = await this.histLoggerService.getHistoryCategoryObjects({
    autz,
    query
  })

  return result.arr && Array.isArray(result.arr) ? result.arr : []
}

async function historyCategoryObjectsByNameHandler(req, reply) {
  const {autz, query, params} = req
  const {cname} = params
  query.categories = cname

  const result = await this.histLoggerService.getHistoryCategoryObjects({
    autz,
    query
  })

  return result.arr && Array.isArray(result.arr) ? result.arr : []
}
//async function addUserActivityHandler(rec, reply) {}
