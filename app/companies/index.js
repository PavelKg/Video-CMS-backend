'use strict'
const errors = require('../errors')
const feature = 'companies'
const featureIn = 'company'

const {
  getCommentsBoxVisibleState: getCommentsBoxVisibleStateSchema,
  setCommentsBoxVisibleState: setCommentsBoxVisibleStateSchema,
  updCompanyLogo: updCompanyLogoSchema,
  getCompanyLogo: getCompanyLogoSchema,
  videoInfoLocation: videoInfoLocationSchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)

  fastify.put(
    '/commentbox/:state',
    {schema: setCommentsBoxVisibleStateSchema},
    setCommentsBoxVisibleHandler
  )
  fastify.get(
    '/commentbox',
    {schema: getCommentsBoxVisibleStateSchema},
    getCommentsBoxVisibleHandler
  )
  fastify.put(
    '/videoinfobottomlocation',
    {schema: videoInfoLocationSchema, config: {location: 'bottom'}},
    setVideoInfoLocationHandler
  )
  fastify.put(
    '/videoinfonextlocation',
    {schema: videoInfoLocationSchema, config: {location: 'next'}},
    setVideoInfoLocationHandler
  )
  fastify.get(
    '/videoinfolocation',
    {schema: videoInfoLocationSchema},
    getVideoInfoLocationHandler
  )
  fastify.put('/logo', {schema: updCompanyLogoSchema}, updCompanyLogoHandler)
  fastify.get('/logo', {schema: getCompanyLogoSchema}, getCompanyLogoHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'companyService']
  }
}

async function setVideoInfoLocationHandler(req, reply) {
  const {location} = reply.context.config
  const {params, autz} = req

  const act = 'mng'
  const permits = autz.permits
  const reqAccess = `${featureIn}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const res = await this.companyService.setVideoInfoLocation({
    autz,
    params,
    location
  })

  const _code = res === 1 ? 204 : 404
  reply.code(_code).send()
}

async function getVideoInfoLocationHandler(req, reply) {
  const {params, autz} = req
  const {cid} = params

  const act = 'mng'
  const permits = autz.permits
  const reqAccess = `${featureIn}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const res = await this.companyService.getVideoInfoLocation({
    autz,
    cid
  })
  const _code = typeof res === 'object' ? 200 : 404
  reply.code(_code).send(res)
}

async function setCommentsBoxVisibleHandler(req, reply) {
  const {params, autz} = req
  const act = 'mng'
  const permits = autz.permits
  const reqAccess = `${featureIn}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const res = await this.companyService.setCommentsBoxState({
    autz,
    params
  })
  const _code = res === 1 ? 204 : 404
  reply.code(_code).send()
}

async function getCommentsBoxVisibleHandler(req, reply) {
  const {params, autz} = req
  const {cid} = params
  const act = 'mng'
  const permits = autz.permits
  const reqAccess = `${featureIn}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const res = await this.companyService.getCommentsBoxState({
    autz,
    cid
  })
  const _code = typeof res === 'object' ? 200 : 404
  reply.code(_code).send(res)
}

async function updCompanyLogoHandler(req, reply) {
  const {params, body, autz} = req
  const {cid} = params
  const act = 'mng'
  const permits = autz.permits
  const reqAccess = `${featureIn}.${act}`
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const res = await this.companyService.updLogo({
    autz,
    cid,
    body
  })
  const _code = res === 1 ? 204 : 404
  reply.code(_code).send()
}

async function getCompanyLogoHandler(req, reply) {
  const {params, autz} = req
  const {cid} = params

  const res = await this.companyService.getLogo({
    autz,
    cid
  })

  const _code = typeof res === 'object' ? 200 : 404
  reply.code(_code).send(res)
}
