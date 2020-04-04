'use strict'

const csvParse = require('csv-parse/lib/sync')
const fileUpload = require('fastify-file-upload')

const {
  user: userSchema,
  getCompanyUsers: getCompanyUsersSchema,
  getCompanyUserInfo: getCompanyUserInfoSchema,
  addUser: addUserSchema,
  importUsers: importUsersSchema,
  updUser: updUserSchema,
  delUser: delUserSchema
} = require('./schemas')

module.exports = async function(fastify, opts) {
  fastify.register(fileUpload)
  // All APIs are under authentication here!
  fastify.addHook('preHandler', fastify.authPreHandler)
  // fastify.addContentTypeParser(
  //   'multipart/form-data',
  //   //{parseAs: 'string'},
  //   csvHandler
  // )

  fastify.get('/', {schema: getCompanyUsersSchema}, getCompanyUsersHandler)
  fastify.get(
    '/:uid',
    {schema: getCompanyUserInfoSchema},
    getCompanyUserInfoHandler
  )
  fastify.post('/', {schema: addUserSchema}, addUserHandler)
  fastify.post('/import', {schema: importUsersSchema}, importUsersHandler)
  fastify.put('/:uid', {schema: updUserSchema}, updUserHandler)
  fastify.delete('/:uid', {schema: delUserSchema}, delUserHandler)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreHandler', 'userService']
  }
}

async function getCompanyUsersHandler(req, reply) {
  const {cid} = req.params
  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })
  return await this.userService.companyUsers({acc, cid, query: req.query})
}

async function getCompanyUserInfoHandler(req, reply) {
  const {cid, uid} = req.params
  let acc = null
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })
  const userInfo = await this.userService.companyUserInfo({acc, cid, uid})
  if (userInfo) {
    reply.code(200).send(userInfo)
  } else {
    reply.code(404).send()
  }
}

async function importUsersHandler(req, reply) {
  const cid = req.params.cid
  const report = []

  const fieldRegCheck = [
    {field: 'id', regex: /^[\S\w*]{5,10}$/i},
    {field: 'name', regex: /^[\S\w*]{3,50}$/i},
    {
      field: 'email',
      regex: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i
    },
    {field: 'password', regex: /^[\S\w*]{8,}$/i}
  ]

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const {name, data, size, mimetype, encoding} = req.raw.files.userlist
  const fileInfo = {name, size, mimetype, encoding}

  const csvData = data.toString('utf8')
  const records = csvParse(csvData.trim(), {
    columns: true
  })
  let resLog = ''

  for (let record in records) {
    let regCheckRes = []
    try {
      const {
        id: uid,
        name: fullname,
        role: rid,
        email,
        password,
        start: activity_start,
        finish: activity_finish
      } = records[record]

      if (!uid || !fullname || !rid || !email || !password) {
        throw Error(
          'ERROR_FIELDS_VALUE (id, name, role, email and password are required fields)'
        )
      }

      fieldRegCheck.forEach((item) => {
        const value = records[record][item.field]
        if (!item.regex.test(value)) {
          regCheckRes.push(item.field)
        }
      })

      if (regCheckRes.length > 0) {
        throw Error(`ERROR_FIELDS_VALUE (${regCheckRes.join(', ')})`)
      }

      const gids = records[record].group.split('/')

      const user = {
        uid,
        cid,
        fullname,
        gids,
        rid,
        email,
        password,
        activity_start,
        activity_finish
      }

      await this.userService.addUser({acc, user})
      resLog = 'success'
    } catch (err) {
      resLog = err.message
    } finally {
      report.push({row: record, id: records[record].id, result: resLog})
    }
  }
  await this.userService.importUsers({acc, fileInfo})
  reply.code(200).send(report)
}

async function addUserHandler(req, reply) {
  const cid = +req.params.cid
  let url = req.raw.url
  let user = {...req.body, cid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const newUser = await this.userService.addUser({acc, user})
  reply
    .code(201)
    .header('Location', `${url}${newUser}`)
    .send()
}

async function updUserHandler(req, reply) {
  const {cid, uid} = req.params
  let user = {...req.body, cid: +cid, uid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const updated = await this.userService.updUser({acc, user})
  const _code = updated === 1 ? 200 : 404
  reply.code(_code).send()
}

async function delUserHandler(req, reply) {
  const {cid, uid} = req.params
  let user = {cid: +cid, uid}

  let acc
  req.jwtVerify(function(err, decoded) {
    if (!err) {
      acc = decoded.user
    }
  })

  const deleted = await this.userService.delUser({acc, user})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}
