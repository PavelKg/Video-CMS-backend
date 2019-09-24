'use strict'

const {
  historyInfo: historyInfoSchema,
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
  console.log('---------------------------acc=', acc)  
  return await this.histLoggerService.getHistoryInfo({acc, query})
}
async function addUserActivityHandler(rec, reply) {}
