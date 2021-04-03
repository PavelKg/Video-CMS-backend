'use strict'
/* global require */
// Read the .env file.
require('dotenv').config()
const fs =require('fs')

const https = {
  key: fs.readFileSync('ssl_keys/privkey.pem'),
  cert: fs.readFileSync('ssl_keys/fullchain.pem')
}
const SERVER_TYPE = 'https'
const add_opt = SERVER_TYPE === 'https' ? {https} : {}

// Require the framework
const fastify = require('fastify')({
  logger: true,
  ignoreTrailingSlash: true,
  bodyLimit: 7291456,
  ...add_opt,
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
    await fastify.listen(process.env.PORT || 8769, '0.0.0.0')
    fastify.swagger()
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
