'use strict'

const {
  series: seriesSchema,
  getCompanySeries: getCompanySeriesSchema,
  getCompanySeriesById: getCompanySeriesByIdSchema,
  addSeries: addSeriesSchema,
  updSeries: updSeriesSchema,
  delSeries: delSeriesSchema
} = require('./schemas')

module.exports = async function(fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)

  fastify.get('/', {schema: getCompanySeriesSchema}, getCompanySeriesHandler)
  fastify.get('/:sid', {schema: getCompanySeriesByIdSchema}, getCompanySeriesByIdHandler)
  fastify.post('/', {schema: addSeriesSchema}, addSeriesHandler)
  fastify.put('/:sid', {schema: updSeriesSchema}, updSeriesHandler)
  fastify.delete('/:sid', {schema: delSeriesSchema}, delSeriesHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreHandler', 'seriesService']
  }
}

async function getCompanySeriesHandler(req, reply) {
  const cid = req.params.cid
  const query =  req.query
  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  return await this.seriesService.companySeries({acc, cid, query})
}

async function getCompanySeriesByIdHandler(req, reply) {
  const {cid, sid} = req.params
  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const seriess = await this.seriesService.companySeriesById({acc, cid, sid})
  const _code = seriess.length === 1 ? 200 : 404
  reply.code(_code).send(seriess[0])
}

async function addSeriesHandler(req, reply) {
  const cid = +req.params.cid
  let url = req.raw.url
  const series = {...req.body, cid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const newSeries = await this.seriesService.addSeries({acc, series})
  reply
    .code(201)
    .header('Location', `${url}${newSeries}`)
    .send()
}

async function updSeriesHandler(req, reply) {
  const {cid, sid} = req.params
  let series = {...req.body, cid: cid, sid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const updated = await this.seriesService.updSeries({acc, series})
  const _code = updated === 1 ? 204 : 404
  reply.code(_code).send()
}

async function delSeriesHandler(req, reply) {
  const {cid, sid} = req.params
  let series = {cid: cid, sid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const deleted = await this.seriesService.delSeries({acc, series})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}
