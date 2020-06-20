'use strict'

const errors = require('../../errors')
const feature = 'users'
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

module.exports = async function (fastify, opts) {
  fastify.register(fileUpload)
  // All APIs are under authentication here!
  fastify.addHook('preValidation', fastify.authPreValidation)
  fastify.addHook('preHandler', fastify.autzPreHandler)
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
    fastify: [
      'authPreValidation',
      'autzPreHandler',
      'userService',
      'telegramService'
    ]
  }
}

async function getCompanyUsersHandler(req, reply) {
  const {query, params, autz} = req
  const permits = autz.permits
  const reqAccess = feature

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const {cid} = params
  return await this.userService.companyUsers({autz, cid, query})
}

async function getCompanyUserInfoHandler(req, reply) {
  const {params, autz} = req
  const permits = autz.permits
  const reqAccess = feature

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }
  const {cid, uid} = params
  const userInfo = await this.userService.companyUserInfo({autz, cid, uid})
  if (userInfo) {
    reply.code(200).send(userInfo)
  } else {
    reply.code(404).send()
  }
}

async function importUsersHandler(req, reply) {
  const {params, raw, autz} = req
  const act = 'import'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const {cid} = params
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

  const {name, data, size, mimetype, encoding} = raw.files.userlist
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

      await this.userService.addUser({autz, user})
      resLog = 'success'
    } catch (err) {
      resLog = `${err.message}`
    } finally {
      report.push({
        row: record,
        id: records[record].id ? records[record].id : '',
        result: `"${resLog}"`
      })
    }
  }
  await this.userService.importUsers({autz, fileInfo})
  reply.code(200).send(report)
}

async function addUserHandler(req, reply) {
  const {params, raw, body, autz} = req
  const act = 'add'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const {cid} = params
  let url = raw.url
  let user = {...body, cid}

  if (!url.match(/.*\/$/i)) {
    url += '/'
  }
  const newUser = await this.userService.addUser({autz, user})
  reply.code(201).header('Location', `${url}${newUser}`).send()
}

async function updUserHandler(req, reply) {
  const {params, body, autz} = req
  const {sendTelegramAuthBy = []} = body
  const act = 'edit'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const {cid, uid} = params
  let user = {...body, cid, uid}

  const rows = await this.userService.updUser({autz, user})
  if (rows.length === 1 && sendTelegramAuthBy.length > 0) {
    try {
      const teleAuthLink = await this.telegramService.deeplinkAuth({
        autz: {
          uid: rows[0].user_uid,
          user_id: rows[0].user_id,
          company_id: rows[0].user_company_id
        },
        cid: rows[0].user_company_id,
        botname: 'vcmsbot'
      })
      const {botname, token} = teleAuthLink
      const url = `https://t.me/${botname}?start=${token}`
      this.userService.notify({
        serv: sendTelegramAuthBy,
        url,
        user: {
          uid: rows[0].user_uid,
          cid: rows[0].user_company_id,
          user_id: rows[0].user_id
        }
      })
    } catch (err) {
      console.log(err)
    }
    const _code = rows.length === 1 ? 200 : 404
    reply.code(_code).send()
  }
}

async function delUserHandler(req, reply) {
  const {params, autz} = req
  const act = 'delete'
  const permits = autz.permits
  const reqAccess = `${feature}.${act}`

  if (!this.autzService.checkAccess(reqAccess, permits)) {
    throw Error(errors.WRONG_ACCESS)
  }

  const {cid, uid} = params
  let user = {cid, uid}

  const deleted = await this.userService.delUser({autz, user})
  const _code = deleted === 1 ? 204 : 404
  reply.code(_code).send()
}
