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
        group_parent as parent, 
        groups.deleted_at AT TIME ZONE $3 AS deleted_at
      FROM "groups", companies
      WHERE group_company_id=$1 AND companies.company_id=groups.group_company_id
        AND ((groups.deleted_at is NOT NULL AND companies.company_show_deleted=true) OR groups.deleted_at IS NULL) 
        ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
        [cid, offset, timezone]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async companyGroupsParents(payload) {
    const {acc, cid} = payload
    const {timezone, uid} = acc
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
        `WITH 
          usrgroups AS (
            select get_user_groups($3, $1) AS ids
          )

        SELECT 
          group_gid as gid, 
          group_name as name
        FROM "groups", companies
        WHERE group_company_id=$1 AND companies.company_id=groups.group_company_id
          AND groups.deleted_at IS NULL 
          AND group_gid IN (SELECT unnest(ids) FROM usrgroups)
        ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
        [cid, offset, uid]
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
        group_parent as parent,
        CASE WHEN group_series IS NULL THEN '{}' ELSE group_series END as group_series,
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
    const {cid, name, parent = null, group_series = []} = group

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'created',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: name,
      details: 'Failure',
      target_data: {...group}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      const {rows: cntExName} = await client.query(
        `SELECT count(*) cnt 
        FROM groups 
        WHERE group_name=$1 and group_company_id=$2;`,
        [name, cid]
      )
      if (cntExName[0].cnt > 0) {
        histData.details = `Error [Group name already exists]`
        throw Error(errors.THIS_GROUP_NAME_IS_NOT_ALLOWED)
      }

      if (parent) {
        const {rows: cntParent} = await client.query(
          `SELECT count(*) cnt 
          FROM groups 
          WHERE group_gid=$1 AND group_company_id=$2
          AND deleted_at IS NULL;`,
          [parent, cid]
        )

        if (cntParent[0].cnt === '0') {
          histData.details = `Error [Parent group does not exist]`
          throw Error(errors.PARENT_GROUP_DOES_NOT_EXIST)
        }
      }

      const {rows} = await client.query(
        `INSERT INTO groups (group_company_id, group_name, group_parent, group_series) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *;`,
        [cid, name, parent, group_series]
      )
      histData.result = typeof rows[0] === 'object'
      histData.object_name = `g_${rows[0].group_gid}`
      histData.target_data = {...histData.target_data, gid: rows[0].group_gid}
      histData.details = 'Success'

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
    const {gid, cid, name, parent = null, group_series = []} = group

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'edited',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: name,
      details: 'Failure [name]',
      target_data: {...group}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      const {rows: cntExName} = await client.query(
        `SELECT count(*) cnt 
        FROM groups 
        WHERE group_name=$1 and group_company_id=$2 
          and group_gid<>$3 and deleted_at is null;`,
        [name, cid, gid]
      )

      if (cntExName[0].cnt > 0) {
        histData.details = `Error [Group name already exists]`
        throw Error(errors.THIS_GROUP_NAME_IS_NOT_ALLOWED)
      }

      if (parent) {
        const {rows: cntParent} = await client.query(
          `SELECT count(*) cnt 
          FROM groups 
          WHERE group_gid=$1 AND group_company_id=$2 
            AND deleted_at IS NULL;`,
          [parent, cid]
        )

        if (cntParent[0].cnt === '0') {
          histData.details = `Error [Parent group does not exist]`
          throw Error(errors.PARENT_GROUP_DOES_NOT_EXIST)
        }
      }

      const {rows} = await client.query(
        `UPDATE groups 
          SET group_name=$3, group_series=$4, group_parent=$5 
          WHERE group_company_id=$2 and group_gid =$1
          AND deleted_at IS NULL
          RETURNING *;`,
        [gid, cid, name, group_series, parent]
      )

      histData.object_name = `g_${rows[0].group_gid}`
      histData.result = rows.length === 1
      histData.details = `[${name}] information updated`
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

  async delGroupSeries(payload) {
    let client = undefined
    const {acc, group} = payload
    const {gid, cid, sid} = group

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'deleted series',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure [delSeries]',
      target_data: {...group}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      const {rows: grps} = await client.query(
        `SELECT count(group_gid) cnt 
          FROM groups 
          WHERE group_company_id=$2 AND group_gid=$1 
          AND group_series && ARRAY[$3::integer];`,
        [gid, cid, sid]
      )

      if (grps[0].cnt === '0') {
        throw Error(errors.THERE_IS_NOT_SERIES_IN_THE_GROUP)
      }

      const {rows} = await client.query(
        `UPDATE groups 
          SET group_series = array_remove(group_series, $3) 
          WHERE group_company_id=$2 and group_gid =$1
          AND deleted_at IS NULL
          RETURNING *;`,
        [gid, cid, sid]
      )

      histData.object_name = `g_${rows[0].group_gid}`
      histData.result = rows.length === 1
      histData.details = `Success`
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

  async addGroupSeries(payload) {
    let client = undefined
    const {acc, group} = payload
    const {gid, cid, sid} = group

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'added group series',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure [addSeries]',
      target_data: {...group}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      const {rows: grps} = await client.query(
        `SELECT count(group_gid) cnt 
          FROM groups 
          WHERE group_company_id=$2 AND group_gid=$1 
          AND group_series && ARRAY[$3::integer];`,
        [gid, cid, sid]
      )

      if (grps[0].cnt > 0) {
        throw Error(errors.THE_GROUP_ALREADY_CONTAINS_THIS_SERIES)
      }

      const {rows} = await client.query(
        `UPDATE groups 
          SET group_series = array_append(group_series, $3) 
          WHERE group_company_id=$2 AND group_gid=$1
          AND deleted_at IS NULL
          RETURNING *;`,
        [gid, cid, sid]
      )

      histData.object_name = `g_${gid}`
      histData.result = rows.length === 1
      if (rows.length === 1) {
        histData.details = `Success`
      }
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
      details: 'Failure',
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

      const {rows: grpr} = await client.query(
        `SELECT count(group_gid) cnt 
          FROM groups 
          WHERE group_parent = $1;`,
        [gid]
      )

      if (grpr[0].cnt !== '0') {
        histData.details = `Error [Group has children]`
        throw Error(errors.THIS_GROUP_HAS_CHILDREN)
      }

      const {rows} = await client.query(
        `UPDATE groups 
        SET deleted_at = now()
        WHERE group_company_id=$2 and group_gid =$1 
        and deleted_at is null
        RETURNING *;`,
        [gid, cid]
      )

      histData.object_name = `g_${gid}`
      histData.result = rows.length === 1
      histData.details = 'Success'
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
  async groupsBindedWithSeries(payload) {
    const {acc, cid, sid} = payload

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
        CASE WHEN group_series && ARRAY[$2::integer] THEN true ELSE false END as binded,
        deleted_at 
      FROM "groups"
      WHERE group_company_id=$1;`,
        [cid, sid]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }
}

module.exports = GroupService
