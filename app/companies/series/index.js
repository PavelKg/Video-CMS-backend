'use strict'

const errors = require('../../errors')
const feature = 'series'

const {
  series: seriesSchema,
  getCompanySeries: getCompanySeriesSchema,
  getCompanySeriesById: getCompanySeriesByIdSchema,
  addSeries: addSeriesSchema,
  updSeries: updSeriesSchema,
  delSeries: delSeriesSchema
} = require('./schemas')

module.exports = async function (fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)

  fastify.get('/', {schema: getCompanySeriesSchema}, getCompanySeriesHandler)
  fastify.get(
    '/:sid',
    {schema: getCompanySeriesByIdSchema},
    getCompanySeriesByIdHandler
  )
  fastify.post('/', {schema: addSeriesSchema}, addSeriesHandler)
  fastify.put('/:sid', {schema: updSeriesSchema}, updSeriesHandler)
  fastify.delete('/:sid', {schema: delSeriesSchema}, delSeriesHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'seriesService']
  }
}

async function getCompanySeriesHandler(req, reply) {
  const {query, params, autz} = req
  const {cid} = params

  const permits = autz.permits
  const reqAccess = feature
  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  return await this.seriesService.companySeries({autz, cid, query})
}

async function getCompanySeriesByIdHandler(req, reply) {
  const {params, autz} = req
  const {cid, sid} = params
  const permits = autz.permits
  const reqAccess = feature

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const seriess = await this.seriesService.companySeriesById({autz, cid, sid})
  const _code = seriess.length === 1 ? 200 : 404
  reply.code(_code).send(seriess[0])
}

async function addSeriesHandler(req, reply) {
  const {params, body, raw, autz} = req
  const act = 'add'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const {cid} = params
  let url = raw.url
  const series = {...body, cid}

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const newSeries = await this.seriesService.addSeries({autz, series})
  reply.code(201).header('Location', `${url}${newSeries}`).send()
}

async function updSeriesHandler(req, reply) {
  const {params, body, autz} = req
  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const {cid, sid} = params
  let series = {...body, cid, sid}

  const updated = await this.seriesService.updSeries({autz, series})
  const _code = updated === 1 ? 204 : 404
  reply.code(_code).send()
}

async function delSeriesHandler(req, reply) {
  const {params, autz} = req
  const act = 'delete'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const {cid, sid} = params
  let series = {cid, sid}

  const deleted = await this.seriesService.delSeries({autz, series})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}
