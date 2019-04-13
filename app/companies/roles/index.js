'use strict'

const {
  role: roleSchema,
  getCompanyRoles: getCompanyRolesSchema,
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)

//  fastify.post('/', { schema: tweetSchema }, addTwitterHandler)
//  fastify.get('/', { schema: getTweetsSchema }, getTwitterHandler)
  fastify.get('/', { schema: getCompanyRolesSchema}, getCompanyRolesHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: [
      'authPreHandler',
      'roleService'
    ]
  }
}

// async function addTwitterHandler (req, reply) {
//   const { text } = req.body
//   await this.tweetService.addTweet(req.user, text)
//   reply.code(204)
// }

// async function getTwitterHandler (req, reply) {
//   return this.tweetService.fetchTweets([req.user._id])
// }

async function getCompanyRolesHandler (req, reply) {
  const cid = req.params.cid
  let acc = null
  req.jwtVerify(function (err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })
  return await this.roleService.companyRoles({acc, cid})
}