'use strict'

const path = require('path')
const pgo = require('pg')
const fpg = require('fastify-postgres')

const fp = require('fastify-plugin')
const jwt = require('fastify-jwt')
const cors = require('fastify-cors')

const nodemailer = require('fastify-nodemailer')
const bitmovinApi = require('bitmovin-javascript').default

const {Storage} = require('@google-cloud/storage')

const Person = require('./person')
const PersonService = require('./person/service')

const Role = require('./companies/roles')
const RoleService = require('./companies/roles/service')

const Group = require('./companies/groups')
const GroupService = require('./companies/groups/service')

const User = require('./companies/users')
const UserService = require('./companies/users/service')

const Message = require('./messages')
const MessageService = require('./messages/service')

const Video = require('./companies/videos')
const VideoService = require('./companies/videos/service')

const Comment = require('./companies/videos/comments')
const CommentService = require('./companies/videos/comments/service')

const BitmovinService = require('./bm')

async function connectToDatabase(fastify) {
  console.log('DB Connecting...')
  pgo.types.setTypeParser(1114, function(stringValue) {
    return stringValue
  })
  const {DB_HOST, DB_USER, DB_PASS, DB_NAME} = process.env
  fastify.register(fpg, {
    connectionString: `postgres://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}`,
    max: 20,
    pg: pgo
  })
  console.log('Finish DB Connecting.')
}

async function fastifyNodemailer(fastify) {
  console.log('Nodemailer loading...')
  const {MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_SERVICE} = process.env
  fastify.register(nodemailer, {
    //pool: true,
    service: MAIL_SERVICE,
    //host: MAIL_HOST,
    //port: MAIL_PORT,
    //secure: true, // use TLS
    auth: {
      user: MAIL_USER,
      pass: MAIL_PASS
    }
    //jsonTransport: true
  })
  console.log('Finish Nodemailer loading')
}

async function fastifyGoogleCloudStorage(fastify) {
  console.log('GCS Connecting...')
  const {GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_KEYFILE_JSON} = process.env

  const gcsOpts = {
    projectId: GOOGLE_CLOUD_PROJECT,
    keyFilename: GOOGLE_CLOUD_KEYFILE_JSON
  }

  console.log('Storage:', gcsOpts.projectId)
  const storage = new Storage(gcsOpts)

  try {
    await storage.getBuckets()
    fastify.decorate('googleCloudStorage', storage)
    console.log('Connect to GCS success')
  } catch (err) {
    console.log('Connect to GCS error:', err)
  }
  console.log('Finish GCS Connecting.')
}

async function fastifyBitmovin(fastify) {
  console.log('Bitmovin Connecting...')
  const {BITMOVIN_API_KEY, BITMOVIN_GCS_INPUT_KEY} = process.env
  try {
    const bitmovin = new bitmovinApi({
      apiKey: BITMOVIN_API_KEY,
      debug: false
    })
    await bitmovin.encoding.inputs.gcs(BITMOVIN_GCS_INPUT_KEY)
    fastify.decorate('bitmovin', bitmovin)
  } catch (error) {
    console.log('Bitmovin Connecting error: ', error)
    throw Error(error)
  }
  console.log('Finish Bitmovin Connecting...')
}

async function authenticator(fastify) {
  console.log('Authenticator Loading...')
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
  console.log('Finish Authenticator Loading.')
}

async function decorateFastifyInstance(fastify) {
  console.log('Decorate Loading...')
  const db = fastify.pg
  const storage = fastify.googleCloudStorage
  const nodemailer = fastify.nodemailer
  const bitmovin = fastify.bitmovin

  const personService = new PersonService(db, nodemailer)
  const roleService = new RoleService(db)
  const groupService = new GroupService(db)
  const userService = new UserService(db)
  const messageService = new MessageService(db)
  const videoService = new VideoService(db, storage)
  const commentService = new CommentService(db)
  const bitmovinService = new BitmovinService(bitmovin)

  fastify.decorate('personService', personService)
  fastify.decorate('roleService', roleService)
  fastify.decorate('groupService', groupService)
  fastify.decorate('userService', userService)
  fastify.decorate('messageService', messageService)
  fastify.decorate('videoService', videoService)
  fastify.decorate('commentService', commentService)
  fastify.decorate('bitmovinService', bitmovinService)

  fastify.decorate('authPreHandler', async function auth(request, reply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })
  console.log('Finish Decorate Loading.')
}

module.exports = async function(fastify, opts) {
  fastify
    .register(fp(authenticator))
    .register(fp(connectToDatabase))
    .register(fp(fastifyNodemailer))
    .register(fp(fastifyGoogleCloudStorage))
    .register(fp(fastifyBitmovin))
    .register(fp(decorateFastifyInstance))
    .register(cors, {
      origin: /[\.kg|:8769|:8080|p-stream.jp]$/,
      path: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      exposedHeaders: 'Location,Date'
    })

    // APIs modules
    .register(Person, {prefix: '/api/users'})
    .register(Role, {prefix: '/api/companies/:cid/roles'})
    .register(Group, {prefix: '/api/companies/:cid/groups'})
    .register(User, {prefix: '/api/companies/:cid/users'})
    .register(Message, {prefix: '/api/messages'})
    .register(Video, {prefix: '/api/companies/:cid/videos'})
    .register(Comment, {prefix: '/api/companies/:cid/videos/:uuid/comments'})
}
