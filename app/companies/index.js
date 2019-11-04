const {
  getCommentsBoxVisibleState: getCommentsBoxVisibleStateSchema,
  setCommentsBoxVisibleState: setCommentsBoxVisibleStateSchema,
  updCompanyLogo: updCompanyLogoSchema,
  getCompanyLogo: getCompanyLogoSchema
} = require('./schemas')

module.exports = async function(fastify, opts) {
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)
  fastify.put(
    '/commentbox/:state',
    {schema: setCommentsBoxVisibleStateSchema},
    setCommentsBoxVisibleHendler
  )
  fastify.get(
    '/commentbox',
    {schema: getCommentsBoxVisibleStateSchema},
    getCommentsBoxVisibleHendler
  )
  fastify.put('/logo', {schema: updCompanyLogoSchema}, updCompanyLogoHendler)
  fastify.get('/logo', {schema: getCompanyLogoSchema}, getCompanyLogoHendler)
}

async function setCommentsBoxVisibleHendler(req, reply) {
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

async function getCommentsBoxVisibleHendler(req, reply) {
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

async function updCompanyLogoHendler(req, reply) {
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

async function getCompanyLogoHendler(req, reply) {
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
