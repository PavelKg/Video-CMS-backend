'use strict'
/* global require */
// Read the .env file.
require('dotenv').config()

// Require the framework
const fastify = require('fastify')({
  logger: true,
  ignoreTrailingSlash: true,
  bodyLimit: 7291456
})

// Register swagger.
// Some commment
const swagger = require('./config/swagger')
fastify.register(require('fastify-swagger'), swagger.options)

// Register application as a normal plugin.
const app = require('./app')
fastify.register(app)

// Start listening.
const start = async () => {
  try {
    await fastify.listen(process.env.PORT || 8769)
    fastify.swagger()
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
