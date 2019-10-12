'use strict'
const errors = require('../../errors')
const db_api = require('../../db_api')

class GroupService {
  constructor(db, histLogger) {
    this.db = db
    this.history_category = 'Groups'
    this.histLogger = histLogger
  }

  async companyGroups(payload) {
    const {acc, cid} = payload
    const {timezone} = acc
    const {
      limit = 'ALL',
      offset = 0,
      sort = 'group_gid',
      filter = ''
    } = payload.query

    const qSort = db_api.sorting(sort, 'groups')
    let qFilter = filter !== '' ? db_api.filtration(filter, 'groups') : ''
    qFilter = db_api.setFilterTz(qFilter, timezone)

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        group_gid as gid, 
        group_company_id as cid,         
        group_name as name, 
        deleted_at AT TIME ZONE $3 AS deleted_at
      FROM "groups"
      WHERE group_company_id=$1 ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
        [cid, offset, timezone]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async companyGroupById(payload) {
    const {acc, cid, gid} = payload
    const {timezone} = acc
    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        group_gid as gid, 
        group_company_id as cid,         
        group_name as name, 
        deleted_at AT TIME ZONE $3 AS deleted_at
      FROM "groups"
      WHERE group_company_id=$1 and group_gid=$2;`,
        [cid, gid, timezone]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async addGroup(payload) {
    let client = undefined
    const {acc, group} = payload
    const {cid, name} = group

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'created',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: name,
      target_data: {...group}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const {rows} = await client.query(
        `INSERT INTO groups (group_company_id, group_name) 
        VALUES ($1, $2) 
        RETURNING *;`,
        [cid, name]
      )
      histData.result = typeof rows[0] === 'object'
      histData.object_name = `g_${rows[0].group_gid}`
      histData.target_data = {...histData.target_data, gid: rows[0].group_gid}

      return rows[0].group_gid
    } catch (error) {
      throw Error(error.message)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async updGroup(payload) {
    let client = undefined
    const {acc, group} = payload
    const {gid, cid, name} = group

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'edited',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: name,
      target_data: {...group}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const {rows} = await client.query(
        `UPDATE groups 
          SET group_name=$3 
          WHERE group_company_id=$2 and group_gid =$1
          AND deleted_at IS NULL
          RETURNING *;`,
        [gid, cid, name]
      )

      histData.object_name = `g_${rows[0].group_gid}`
      histData.result = rows.length === 1
      return rows.length
    } catch (error) {
      throw Error(error.message)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async delGroup(payload) {
    let client = undefined
    const {acc, group} = payload
    const {gid, cid} = group

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'deleted',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      target_data: {...group}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const {rows: usrs} = await client.query(
        `SELECT count(users.user_id) cnt 
          FROM groups, users 
          WHERE group_company_id=$2 AND group_gid=$1 
            AND group_gid = ANY(user_groups) 
            AND users.deleted_at is null;`,
        [gid, cid]
      )
      if (Array.isArray(usrs) && usrs[0].cnt > 0) {
        throw Error(errors.CANNOT_DELETE_A_GROUP_WITH_EXISTING_USERS)
      }

      const {rows} = await client.query(
        `UPDATE groups 
        SET deleted_at = now()
        WHERE group_company_id=$2 and group_gid =$1 
        and deleted_at is null
        RETURNING *;`,
        [gid, cid]
      )

      histData.object_name = `g_${rows[0].group_gid}`
      histData.result = rows.length === 1
      return rows.length
    } catch (error) {
      throw Error(error.message)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }
}

module.exports = GroupService
