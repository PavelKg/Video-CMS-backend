const {
  getCommentsBoxVisibleState: getCommentsBoxVisibleStateSchema,
  setCommentsBoxVisibleState: setCommentsBoxVisibleStateSchema,
  updCompanyLogo: updCompanyLogoSchema,
  getCompanyLogo: getCompanyLogoSchema,
  videoInfoLocation: videoInfoLocationSchema
} = require('./schemas')

module.exports = async function(fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)
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

async function setVideoInfoLocationHandler(req, reply) {
  const {location} = reply.context.config
  const params = req.params

  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const res = await this.companyService.setVideoInfoLocation({
    acc,
    params,
    location
  })

  const _code = res === 1 ? 204 : 404
  reply.code(_code).send()
}

async function getVideoInfoLocationHandler(req, reply) {
  const cid = req.params.cid

  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const res = await this.companyService.getVideoInfoLocation({
    acc,
    cid
  })
  const _code = typeof res === 'object' ? 200 : 404
  reply.code(_code).send(res)
}

async function setCommentsBoxVisibleHandler(req, reply) {
  const params = req.params

  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const res = await this.companyService.setCommentsBoxState({
    acc,
    params
  })
  const _code = res === 1 ? 204 : 404
  reply.code(_code).send()
}

async function getCommentsBoxVisibleHandler(req, reply) {
  const cid = req.params.cid

  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const res = await this.companyService.getCommentsBoxState({
    acc,
    cid
  })
  const _code = typeof res === 'object' ? 200 : 404
  reply.code(_code).send(res)
}

async function updCompanyLogoHandler(req, reply) {
  const body = req.body
  const cid = req.params.cid

  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const res = await this.companyService.updLogo({
    acc,
    cid,
    body
  })
  const _code = res === 1 ? 204 : 404
  reply.code(_code).send()
}

async function getCompanyLogoHandler(req, reply) {
  const cid = req.params.cid

  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const res = await this.companyService.getLogo({
    acc,
    cid
  })

  const _code = typeof res === 'object' ? 200 : 404
  reply.code(_code).send(res)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreHandler', 'companyService']
  }
}
