'use strict'

const path = require('path')

const fp = require('fastify-plugin')
const jwt = require('fastify-jwt')
const pg = require('fastify-postgres')

const User = require('./user')
const UserService = require('./user/service')

async function connectToDatabase(fastify) {
  const {DB_HOST, DB_USER, DB_PASS, DB_NAME} = process.env
  fastify
    .register(pg, {
      //connectionString: `postgres://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}`,
      connectionString: `postgres://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}`,
      max: 20
    })
}

async function authenticator(fastify) {
  fastify
    // JWT is used to identify the user
    // See https://github.com/fastify/fastify-jwt
    .register(jwt, {
      secret: process.env.JWT_SECRET,
      algorithms: ['RS256'],
      sign: {
        issuer: 'vcms.pepex.kg/api',
        expiresIn: '4h'
      },
      verify: {
        issuer: 'vcms.pepex.kg/api',
      }
    })
}




async function decorateFastifyInstance(fastify) {
  const db = fastify.pg

  // const userCollection = await db.createCollection('users')
  const userService = new UserService(db)
  //await userService.ensureIndexes(db)
  fastify.decorate('userService', userService)

  fastify.decorate('authPreHandler', async function auth(request, reply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })
}

module.exports = async function(fastify, opts) {
  fastify
    .register(fp(authenticator))
    .register(fp(connectToDatabase))
    .register(fp(decorateFastifyInstance))
    // APIs modules
    .register(User, {prefix: '/api/user'})
}
