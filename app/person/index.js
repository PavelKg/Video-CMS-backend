'use strict'

const {
  login: loginSchema,
  logout: logoutSchema,
  passwordResetRequest: passwordResetRequestSchema,
  passwordUpdate: passwordUpdateSchema,
  getProfile: getProfileSchema,
  getProfileMenu: getProfileMenuSchema,
  companyInfo: companyInfoSchema
} = require('./schemas')

const errors = require('../errors')

module.exports = async function (fastify, opts) {
  // Route registration
  // fastify.<method>(<path>, <schema>, <handler>)
  // schema is used to validate the input and serialize the output

  // Unlogged APIs
  fastify.post('/login', {schema: loginSchema}, loginHandler)
  fastify.post(
    '/password-reset-request',
    {schema: passwordResetRequestSchema},
    passwordResetRequestHandler
  )
  fastify.put(
    '/password',
    {schema: passwordUpdateSchema},
    passwordUpdateHandler
  )

  // Logged APIs
  fastify.register(async function (fastify) {
    fastify.addHook('preValidation', fastify.authPreValidation)
    fastify.addHook('preHandler', fastify.autzPreHandler)
    fastify.get('/me', {schema: getProfileSchema}, meHandler)
    fastify.get('/company', {schema: companyInfoSchema}, companyInfoHandler)
    fastify.get('/menu', {schema: getProfileMenuSchema}, getProfileMenuHandler)
    fastify.post('/logout', {schema: logoutSchema}, logoutHandler)
  })

  fastify.setErrorHandler(function (error, request, reply) {
    const message = error.message
    if (errors[message]) {
      reply.code(412)
    }
    reply.send(error)
  })
}

// Fastify checks the existance of those decorations before registring `user.js`
module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'personService', 'jwt']
  }
}

async function loginHandler(req, reply) {
  const {username, password} = req.body
  const person = await this.personService.login(username, password)
  return {token: this.jwt.sign({user: person})}
}

async function logoutHandler(req, reply) {
  const {autz} = req
  await this.personService.logout(autz)
  reply.code(200).send()
}

async function meHandler(req, reply) {
  const {autz} = req
  return this.personService.getProfile(autz)
}

async function getProfileMenuHandler(req, reply) {
  const {autz} = req
  return this.personService.getProfileMenu(autz)
}

async function companyInfoHandler(req, reply) {
  const {autz} = req
  return this.personService.getCompanyInfo(autz)
}

async function passwordResetRequestHandler(req, reply) {
  const {email, locale = 'en'} = req.body

  const person = await this.personService.findUserByEmail(email)
  const {token, valid_date} = await this.personService.getPasswordResetToken(
    person,
    email
  ) //this.jwt.sign({user: person})
  const {fullname} = person
  await this.personService.sendEmail({
    email,
    fullname,
    token,
    valid_date,
    locale
  })

  reply.code(202).send()
}

async function passwordUpdateHandler(req, reply) {
  const {token, password} = req.body
  const result = await this.personService.updateUserPasword(token, password)
  if (result > 0) {
    reply.code(200)
  } else {
    reply.code(404)
  }
  reply.send()
}
// async function userHandler(req, reply) {
//   return this.userService.getProfile(
//     this.transformStringIntoObjectId(req.params.userId)
//   )
// }

// async function searchHandler(req, reply) {
//   const {search} = req.query
//   return this.userService.search(search)
// }
