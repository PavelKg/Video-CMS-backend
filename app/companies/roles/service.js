'use strict'
const errors = require('../../errors')

class RoleService {
  constructor(db) {
    this.db = db
  }

  async companyRoles(payload) {
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

  async addRole(payload) {
    const {acc, role} = payload
    const {rid, cid, name, is_admin = false} = role
    if (acc.company_id !== cid || acc.role !== 'admin') {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    const {rows} = await client.query(
      `INSERT INTO roles (role_rid, role_company_id, role_name, role_is_admin) 
      VALUES ($1, $2, $3, $4) 
      RETURNING role_rid;`,
      [rid, cid, name, is_admin]
    )

    client.release()
    return rows[0].role_rid
  }

  async updRole(payload) {
    const {acc, role} = payload
    const {rid, cid, name, is_admin = false} = role

    if (acc.company_id !== cid || acc.role !== 'admin') {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    const {rows} = await client.query(
      `with updated AS(
        UPDATE roles 
        SET role_name=$3, role_is_admin=$4 
        WHERE role_company_id=$2 and role_rid =$1 
        RETURNING 1
        )
        SELECT count(*) upd FROM updated;`,
      [rid, cid, name, is_admin]
    )

    client.release()
    return +rows[0].upd
  }

  async delRole(payload) {
    const {acc, role} = payload
    const {rid, cid} = role

    if (acc.company_id !== cid || acc.role !== 'admin') {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    const {rows} = await client.query(
      `with deleted AS(
        UPDATE roles 
        SET deleted_at = now()::timestamp without time zone 
        WHERE role_company_id=$2 and role_rid =$1 
        and deleted_at is null
        RETURNING 1
        )
        SELECT count(*) del FROM deleted;`,
      [rid, cid]
    )

    client.release()
    return +rows[0].del
  }
}

module.exports = RoleService