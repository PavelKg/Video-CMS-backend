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
      target_data: {...group}
    }

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `INSERT INTO groups (group_company_id, group_name) 
        VALUES ($1, $2) 
        RETURNING group_gid;`,
        [cid, name]
      )
      histData.result = typeof rows[0] === 'object'
      histData.target_data = {...histData.target_data, gid: rows[0].group_gid}
      return rows[0].group_gid
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async updGroup(payload) {
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
      target_data: {...group}
    }

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rowCount} = await client.query(
        `UPDATE groups 
          SET group_name=$3 
          WHERE group_company_id=$2 and group_gid =$1
          AND deleted_at IS NULL;`,
        [gid, cid, name]
      )
      histData.result = rowCount === 1
      return rowCount
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async delGroup(payload) {
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
      target_data: {...group}
    }

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()

    try {
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

      const {rowCount} = await client.query(
        `UPDATE groups 
        SET deleted_at = now()
        WHERE group_company_id=$2 and group_gid =$1 
        and deleted_at is null;`,
        [gid, cid]
      )
      histData.result = rowCount === 1
      return rowCount
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
      this.histLogger.saveHistoryInfo(histData)
    }
  }
}

module.exports = GroupService
