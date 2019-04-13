'use strict'
const errors = require('../../errors')

class RoleService {
  constructor (db) {
    this.db = db
  }

  async companyRoles (payload) {
    const {acc, cid} = payload
    const client = await this.db.connect()
    const {rows} = await client.query(
      `select companyroles($1::jsonb, $2) as roles;`,
      [acc, cid]
    )

    client.release()
    const cRoles = rows[0].roles

    if (!cRoles) throw new Error(errors.WRONG_LOAD_ROLES)
    return cRoles
  }

  async addRole (companyId, roleData) {
  }
  async editRole (companyId, roleId, roleData) {
  }
  async delRole (companyId, roleId) {
  }
}

module.exports = RoleService