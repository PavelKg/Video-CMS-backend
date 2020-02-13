'use strict'
const errors = require('../../errors')
const db_api = require('../../db_api')

class RoleService {
  constructor(db, histLogger) {
    this.db = db
    this.history_category = 'Roles'
    this.histLogger = histLogger
  }

  async companyRoles(payload) {
    const {acc, cid} = payload
    const {timezone} = acc
    const {
      limit = 'ALL',
      offset = 0,
      sort = 'role_rid',
      filter = ''
    } = payload.query

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const qSort = db_api.sorting(sort, 'roles')
    let qFilter = filter !== '' ? db_api.filtration(filter, 'roles') : ''
    qFilter = db_api.setFilterTz(qFilter, timezone)

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `select 
          role_rid as rid, 
          role_name as name, 
          role_company_id as cid, 
          role_is_admin as is_admin, 
          deleted_at AT TIME ZONE $3 AS deleted_at 
        from roles
        where role_company_id=$1 ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
        [cid, offset, timezone]
      )

      const cRoles = rows

      if (!cRoles) throw new Error(errors.WRONG_LOAD_ROLES)
      return cRoles
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }

  async companyRoleById(payload) {
    const {acc, cid, rid} = payload
    const {timezone} = acc
    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `select role_rid as rid, 
          role_name as name, 
          role_company_id as cid, 
          role_is_admin as is_admin, 
          deleted_at AT TIME ZONE $3 AS deleted_at 
        from roles
        where role_company_id=$1 and role_rid=$2;`,
        [cid, rid, timezone]
      )
      return rows
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }

  async addRole(payload) {
    let client = undefined
    const {acc, role} = payload
    const {rid, cid, name, is_admin = false} = role

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'created',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: rid,
      details: 'Failure',
      target_data: {}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      const {rows: cntExRid} = await client.query(
        `SELECT count(*) cnt 
        FROM roles 
        WHERE role_rid=$1 and role_company_id=$2;`,
        [rid, cid]
      )

      if (cntExRid[0].cnt > 0) {
        histData.details = `Error [Role rid already exists]`
        throw Error(errors.THIS_ROLE_RID_IS_NOT_ALLOWED)
      }      

      const {rows} = await client.query(
        `INSERT INTO roles (role_rid, role_company_id, role_name, role_is_admin) 
      VALUES ($1, $2, $3, $4) 
      RETURNING role_rid AS rid, 
        role_id, 
        role_is_admin AS is_admin, 
        role_company_id AS cid, 
        role_name AS name;`,
        [rid, cid, name, is_admin]
      )

      histData.result = typeof rows[0] === 'object'
      histData.target_data = {...rows[0]}
      histData.details = 'Success'

      return rows[0].rid
    } catch (error) {
      throw Error(error)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async updRole(payload) {
    let client = undefined
    const {acc, role} = payload
    const {rid, cid, name, is_admin = false} = role

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'edited',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: rid,
      details: `Failure [${name}]`,
      target_data: {...role}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      
      const {rowCount} = await client.query(
        `UPDATE roles 
        SET role_name=$3, role_is_admin=$4 
        WHERE role_company_id=$2 and role_rid =$1 
          AND deleted_at IS NULL;`,
        [rid, cid, name, is_admin]
      )
      histData.result = rowCount === 1
      histData.details = `[${name}] information updated`
      return rowCount
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async delRole(payload) {
    let client = undefined
    const {acc, role} = payload
    const {rid, cid} = role

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'deleted',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: rid,
      details: 'Failure',
      target_data: {...role}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      const {rows: usrs} = await client.query(
        `select count(users.user_id) cnt 
       from roles, users 
       where role_company_id=$2 and role_rid=$1 
        and user_role_id = role_id and users.deleted_at is null;`,
        [rid, cid]
      )
      if (Array.isArray(usrs) && usrs[0].cnt > 0) {
        throw Error(errors.CANNOT_DELETE_A_ROLE_WITH_EXISTING_USERS)
      }

      const {rowCount} = await client.query(
        `UPDATE roles 
        SET deleted_at = now() 
        WHERE role_company_id=$2 and role_rid =$1 
        and deleted_at is null;`,
        [rid, cid]
      )
      histData.result = rowCount === 1
      histData.details = 'Success'
      return rowCount
    } catch (error) {
      throw Error(error)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }
}

module.exports = RoleService
