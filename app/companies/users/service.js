'use strict'
//const crypto = require('crypto')
const errors = require('../../errors')
const db_api = require('../../db_api')

class UserService {
  constructor(db, histLogger) {
    this.db = db
    this.history_category = 'Users'
    this.histLogger = histLogger
  }

  async companyUsers(payload) {
    const {autz, cid} = payload
    const {timezone} = autz
    const {
      limit = 'ALL',
      offset = 0,
      sort = 'user_uid',
      filter = ''
    } = payload.query

    if (autz.company_id !== cid || !autz.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const qSort = db_api.sorting(sort, 'users')
    let qFilter = filter !== '' ? db_api.filtration(filter, 'users') : ''
    qFilter = db_api.setFilterTz(qFilter, timezone)
    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        user_uid as uid, 
        user_fullname as fullname, 
        role_rid as rid, 
        user_company_id as cid,
        TO_CHAR(user_activity_start::DATE, 'yyyy-mm-dd') as activity_start,
        TO_CHAR(user_activity_finish::DATE, 'yyyy-mm-dd') as activity_finish,        
        CASE WHEN users.user_groups IS NULL THEN '{}' ELSE users.user_groups END as gids, 
        (select CASE WHEN array_agg(group_name) IS NULL THEN '{}' ELSE array_agg(group_name) END 
          from groups where "groups".group_gid = ANY(users.user_groups))  as groups_name, 
        user_email email, 
        users.deleted_at AT TIME ZONE $3 AS deleted_at,
        (SELECT max(created_at)  
         FROM users_history_log
         WHERE userhist_user_id = users.user_id 
         AND userhist_action='logged-in' ) AT TIME ZONE $3 as last_login
      FROM users
      LEFT OUTER JOIN roles
      ON users.user_role_id = roles.role_id
      LEFT JOIN companies
      ON users.user_company_id = companies.company_id
      WHERE user_company_id=$1 
        AND ((users.deleted_at is NOT NULL AND companies.company_show_deleted=true) OR users.deleted_at IS NULL)
        ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
        [cid, offset, timezone]
      )
      return rows
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }

  async companyUserInfo(payload) {
    const {autz, cid, uid} = payload
    const {timezone} = autz

    if (autz.company_id !== cid || !autz.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        user_uid as uid, 
        user_fullname as fullname, 
        role_rid as rid, 
        user_company_id as cid,
        TO_CHAR(user_activity_start::DATE, 'yyyy-mm-dd') as activity_start,
        TO_CHAR(user_activity_finish::DATE, 'yyyy-mm-dd') as activity_finish,        
        CASE WHEN users.user_groups IS NULL THEN '{}' ELSE users.user_groups END as gids, 
        (select CASE WHEN array_agg(group_name) IS NULL THEN '{}' ELSE array_agg(group_name) END 
          from groups where "groups".group_gid = ANY(users.user_groups))  as groups_name, 
        user_email email, 
        users.deleted_at AT TIME ZONE $3 AS deleted_at,
        (SELECT max(created_at)  
        FROM users_history_log
        WHERE userhist_user_id = users.user_id 
        AND userhist_action='logged-in' ) AT TIME ZONE $3 as last_login
      FROM users
      LEFT OUTER JOIN roles
      ON users.user_role_id = roles.role_id
      WHERE user_company_id=$1 and user_uid=$2::character varying;`,
        [cid, uid, timezone]
      )

      return rows.length ? rows[0] : ''
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }

  async importUsers(payload) {
    const {autz, fileInfo} = payload
    const cid = autz.company_id

    let histData = {
      category: this.history_category,
      action: 'users-import',
      result: true,
      user_id: autz.user_id,
      user_uid: autz.uid,
      cid: cid,
      object_name: fileInfo.name,
      details: `success`,
      target_data: fileInfo
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }
    } catch (error) {
      throw Error(error)
    } finally {
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async addUser(payload) {
    let client = undefined
    const {autz, user} = payload
    const {
      uid,
      cid,
      fullname,
      rid,
      email = '',
      password,
      gids = [],
      activity_start = '',
      activity_finish = ''
    } = user

    let histData = {
      category: this.history_category,
      action: 'created',
      result: false,
      user_id: autz.user_id,
      user_uid: autz.uid,
      cid: autz.company_id,
      object_name: uid,
      details: `Failure [${fullname}]`,
      target_data: {
        uid,
        cid,
        fullname,
        rid,
        email,
        gids,
        activity_start,
        activity_finish
      }
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      const {rows: cntExEmail} = await client.query(
        `SELECT count(*) cnt 
        FROM users 
        WHERE user_email=$1 AND deleted_at IS NULL;`,
        [email]
      )

      if (cntExEmail[0].cnt > 0) {
        histData.details = `Error [Email already exists]`
        throw Error(errors.THIS_EMAIL_IS_NOT_ALLOWED)
      }

      const {rows: cntExUid} = await client.query(
        `SELECT count(*) cnt 
        FROM users 
        WHERE user_company_id=$2 AND user_uid=$1 AND deleted_at IS NULL;`,
        [uid, cid]
      )

      if (cntExUid[0].cnt > 0) {
        histData.details = `Error [Uid already exists]`
        throw Error(errors.THIS_UID_IS_NOT_ALLOWED)
      }

      const {rows} = await client.query(
        `with urole as (
        select role_id id from roles where role_company_id=$2 and role_rid=$5)
        
        INSERT INTO users (
                user_uid, 
                user_fullname, 
                user_groups, 
                user_role_id, 
                user_email, 
                user_password,
                user_company_id,
                user_activity_start,
                user_activity_finish) 
              VALUES ($1, $3, $4, (select id from urole), $6, crypt($7, gen_salt('bf')), $2, 
              CASE WHEN $8<>'' THEN $8::date ELSE null END, 
              CASE WHEN $9<>'' THEN $9::date ELSE null END) 
              RETURNING user_uid
        ;`,
        [
          uid,
          cid,
          fullname,
          gids,
          rid,
          email,
          password,
          activity_start,
          activity_finish
        ]
      )
      histData.result = typeof rows[0] === 'object'
      histData.details = `Success [${fullname}]`
      return rows[0].user_uid
    } catch (error) {
      throw Error(error)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async updUser(payload) {
    let client = undefined
    const {autz, user} = payload
    const {
      uid,
      cid,
      fullname,
      rid,
      email = '',
      password = '',
      activity_start = '',
      activity_finish = ''
    } = user
    const gids = user.gids ? user.gids : []

    let histData = {
      category: this.history_category,
      action: 'edited',
      result: false,
      user_id: autz.user_id,
      user_uid: autz.uid,
      cid: autz.company_id,
      object_name: uid,
      details: `Failure [${fullname}]`,
      target_data: {
        uid,
        cid,
        fullname,
        rid,
        email,
        gids,
        activity_start,
        activity_finish
      }
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }
      client = await this.db.connect()

      const {rows: cntExEmail} = await client.query(
        `SELECT count(*) cnt 
        FROM users 
        WHERE user_email=$1 AND user_uid<>$2 AND deleted_at IS NULL;`,
        [email, uid]
      )

      if (cntExEmail[0].cnt > 0) {
        histData.details = `Error [Email already exists]`
        throw Error(errors.THIS_EMAIL_IS_NOT_ALLOWED)
      }

      const {rowCount} = await client.query(
        `UPDATE users 
        SET user_fullname=$3, 
          user_groups = $4,
          user_role_id = (select role_id from roles where role_rid=$5 and role_company_id=$2),
          user_email = $6,
          user_password = CASE WHEN $7<>'' THEN crypt($7, gen_salt('bf')) ELSE user_password END,
          user_activity_start = CASE WHEN $8<>'' THEN $8::date ELSE null END,
          user_activity_finish = CASE WHEN $9<>'' THEN $9::date ELSE null END
        WHERE user_company_id=$2 and user_uid =$1 AND deleted_at IS NULL;`,
        [
          uid,
          cid,
          fullname,
          gids,
          rid,
          email,
          password,
          activity_start,
          activity_finish
        ]
      )
      histData.result = rowCount === 1
      histData.details = `[ ${fullname} ] information updated`
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

  async delUser(payload) {
    let client = undefined
    const {autz, user} = payload
    const {uid, cid} = user

    let histData = {
      category: this.history_category,
      action: 'deleted',
      result: false,
      user_id: autz.user_id,
      user_uid: autz.uid,
      cid: autz.company_id,
      object_name: uid,
      details: 'Failure',
      target_data: {...user}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }
      client = await this.db.connect()
      const {rowCount} = await client.query(
        `UPDATE users 
        SET deleted_at = now() 
        WHERE user_company_id=$2 and user_uid =$1::character varying 
        AND deleted_at IS NULL;`,
        [uid, cid]
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

module.exports = UserService
