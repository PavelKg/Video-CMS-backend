'use strict'

const {
  historyInfo: historyInfoSchema,
  historyCategories: historyCategoriesSchema,
  historyCategoryObjects: historyCategoryObjectsSchema,
  addUserActivity: addUserActivitySchema
} = require('./schemas')

module.exports = async function(fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)

  // fastify.get(
  //   '/companies/:cid',
  //   {schema: historyInfoSchema},
  //   getHistoryInfoHandler
  // )
  fastify.get('/', {schema: historyInfoSchema}, getHistoryInfoHandler)
  fastify.get(
    '/categories',
    {schema: historyCategoriesSchema},
    historyCategoriesHandler
  )
  fastify.get(
    '/categories/:cname/objects',
    {schema: historyCategoryObjectsSchema},
    historyCategoryObjectsHandler
  )
  fastify.post(
    '/companies/:cid/uid/:uid',
    {schema: addUserActivitySchema},
    addUserActivityHandler
  )
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreHandler', 'histLoggerService']
  }
}

async function getHistoryInfoHandler(req, reply) {
  const query = req.query

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  return await this.histLoggerService.getHistoryInfo({acc, query})
}

async function historyCategoriesHandler(req, reply) {
  const query = req.query

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const categories = await this.histLoggerService.getHistoryCategories({
    acc,
    query
  })
  return categories
}

async function historyCategoryObjectsHandler(req, reply) {
  const query = req.query
  const {cname} = req.params

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const categories = await this.histLoggerService.getHistoryCategoryObjects({
    acc,
    query,
    cname
  })
  return categories
}
async function addUserActivityHandler(rec, reply) {}
