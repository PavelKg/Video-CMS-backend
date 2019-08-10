'use strict'

const {
  login: loginSchema,
  passwordResetRequest: passwordResetRequestSchema,
  passwordUpdate: passwordUpdateSchema,
  //registration: registrationSchema,
  //search: searchSchema,
  getProfile: getProfileSchema
} = require('./schemas')

const errors = require('../errors')

module.exports = async function(fastify, opts) {
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

  //fastify.post('/register', {schema: registrationSchema}, registerHandler)

  // Logged APIs
  fastify.register(async function(fastify) {
    fastify.addHook('preHandler', fastify.authPreHandler)
    fastify.get('/me', {schema: getProfileSchema}, meHandler)
    //fastify.get('/:userId', {schema: getProfileSchema}, userHandler)
    //fastify.get('/search', {schema: searchSchema}, searchHandler)
  })

  fastify.setErrorHandler(function(error, request, reply) {
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
    fastify: ['authPreHandler', 'personService', 'jwt']
  }
}

// In all handlers `this` is the fastify instance
// The fastify instance used for the handler registration

async function loginHandler(req, reply) {
  const {username, password} = req.body
  const person = await this.personService.login(username, password)
  return {token: this.jwt.sign({user: person})}
}

async function meHandler(req, reply) {
  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  return this.personService.getProfile(acc)
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
