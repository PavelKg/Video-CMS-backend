'use strict'

const path = require('path')

const fp = require('fastify-plugin')
const jwt = require('fastify-jwt')
const cors = require('fastify-cors')
const pg = require('fastify-postgres')
const swagger = require('fastify-swagger')
//const swagger = require('../config/swagger')

const Person = require('./person')
const PersonService = require('./person/service')

const Role = require('./companies/roles')
const RoleService = require('./companies/roles/service')

const Group = require('./companies/groups')
const GroupService = require('./companies/groups/service')

const User = require('./companies/users')
const UserService = require('./companies/users/service')

async function connectToDatabase(fastify) {
  const {DB_HOST, DB_USER, DB_PASS, DB_NAME} = process.env
  fastify.register(pg, {
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
        issuer: 'vcms.pepex.kg/api'
      }
    })
}

async function decorateFastifyInstance(fastify) {
  const db = fastify.pg

  const personService = new PersonService(db)
  const roleService = new RoleService(db)
  const groupService = new GroupService(db)
  const userService = new UserService(db)

  fastify.decorate('personService', personService)
  fastify.decorate('roleService', roleService)
  fastify.decorate('groupService', groupService)
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
    .register(cors, {
      origin: false,
      path: '*'
    })
    // .register(swagger, {
    //   routePrefix: '/documentation',
    //   swagger: {
    //     info: {
    //       title: String,
    //       description: String,
    //       version: String
    //     },
    //     externalDocs: Object,
    //     host: String,
    //     schemes: [String],
    //     consumes: [String],
    //     produces: [String],
    //     tags: [Object],
    //     securityDefinitions: Object
    //   }
    // })
    // APIs modules
    .register(Person, {prefix: '/api/users'})
    .register(Role, {prefix: '/api/companies/:cid/roles'})
    .register(Group, {prefix: '/api/companies/:cid/groups'})
    .register(User, {prefix: '/api/companies/:cid/users'})
}
