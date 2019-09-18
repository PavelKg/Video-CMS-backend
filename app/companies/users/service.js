'use strict'
//const crypto = require('crypto')
const errors = require('../../errors')
const db_api = require('../../db_api')

class UserService {
  constructor(db) {
    this.db = db
  }

  async companyUsers(payload) {
    const {acc, cid} = payload
    const {timezone} = acc
    const {
      limit = 'ALL',
      offset = 0,
      sort = 'user_uid',
      filter = ''
    } = payload.query

    if (acc.company_id !== cid || !acc.is_admin) {
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
        CASE WHEN users.user_groups IS NULL THEN '{}' ELSE users.user_groups END as gids, 
        (select CASE WHEN array_agg(group_name) IS NULL THEN '{}' ELSE array_agg(group_name) END 
          from groups where "groups".group_gid = ANY(users.user_groups))  as groups_name, 
        user_email email, 
        users.deleted_at AT TIME ZONE $3 AS deleted_at,
        (select max(userhist_date)  
         from user_history_log
         where userhist_user_id = users.user_id and userhist_action='login' ) AT TIME ZONE $3 as last_login
      FROM users
      LEFT OUTER JOIN roles
      ON users.user_role_id = roles.role_id
      WHERE user_company_id=$1 ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
        [cid, offset, timezone]
      )
      console.log('rows=', rows)
      return rows
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }

  async companyUserInfo(payload) {
    const {acc, cid, uid} = payload
    const {timezone} = acc

    if (acc.company_id !== cid || !acc.is_admin) {
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
        CASE WHEN users.user_groups IS NULL THEN '{}' ELSE users.user_groups END as gids, 
        (select CASE WHEN array_agg(group_name) IS NULL THEN '{}' ELSE array_agg(group_name) END 
          from groups where "groups".group_gid = ANY(users.user_groups))  as groups_name, 
        user_email email, 
        users.deleted_at AT TIME ZONE $3 AS deleted_at,
        (select max(userhist_date)  
        from users_history_log
        where userhist_user_id = users.user_id and userhist_action='login' ) AT TIME ZONE $3 as last_login
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

  async addUser(payload) {
    const {acc, user} = payload
    const {uid, cid, fullname, rid, email = '', password, gids =[]} = user

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
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
                user_company_id) 
              VALUES ($1, $3, $4, (select id from urole), $6, crypt($7, gen_salt('bf')), $2) 
              RETURNING user_uid
        ;`,
        [uid, cid, fullname, gids, rid, email, password]
      )

      return rows[0].user_uid
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }

  async updUser(payload) {
    const {acc, user} = payload
    const {uid, cid, fullname, rid, email = '', password = ''} = user
    const gids = user.gids ? user.gids : []

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rowCount} = await client.query(
        `UPDATE users 
        SET user_fullname=$3, 
          user_groups = $4,
          user_role_id = (select role_id from roles where role_rid=$5 and role_company_id=$2),
          user_email = $6,
          user_password = CASE WHEN $7<>'' THEN crypt($7, gen_salt('bf')) ELSE user_password END
        WHERE user_company_id=$2 and user_uid =$1 AND deleted_at IS NULL;`,
        [uid, cid, fullname, gids, rid, email, password]
      )

      return rowCount
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }

  async delUser(payload) {
    const {acc, user} = payload
    const {uid, cid} = user

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rowCount} = await client.query(
        `UPDATE users 
        SET deleted_at = now() 
        WHERE user_company_id=$2 and user_uid =$1::character varying 
        AND deleted_at IS NULL;`,
        [uid, cid]
      )

      return rowCount
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }
}

module.exports = UserService
