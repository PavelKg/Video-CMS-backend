'use strict'
/* global require */
// Read the .env file.
require('dotenv').config()

// Require the framework
const fastify = require('fastify')({
  logger: true,
  pluginTimeout: 10000
})

// Register application as a normal plugin.
const app = require('./app')
fastify.register(app)

// Start listening.
const start = async () => {
  try {
    await fastify.listen(process.env.PORT || 8769)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
