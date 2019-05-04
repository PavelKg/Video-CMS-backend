'use strict'
const crypto = require('crypto')
const errors = require('../../errors')

class UserService {
  constructor(db) {
    this.db = db
  }

  async companyUsers(payload) {
    const {acc, cid} = payload
    const {limit='ALL' , offset=0, order_by='uid'} = payload.query

    const q_order_by = order_by.replace(';', '')

    const client = await this.db.connect()
    const {rows} = await client.query(
      `SELECT 
        users.user_uid as uid, 
        users.user_fullname as fullname, 
        roles.role_rid as rid, 
        "groups".group_gid as gid, 
        users.user_email email, 
        users.deleted_at
      FROM users
      LEFT OUTER JOIN roles
      ON users.user_role_id = roles.role_id
      LEFT OUTER JOIN "groups"
      ON users.user_group_id = "groups".group_id
      WHERE user_company_id=$1 ORDER BY ${q_order_by} ASC LIMIT ${limit} OFFSET $2;`,
      [cid, offset]
    )

    client.release()
    const cUsers = rows

    //if (!cUsers) throw new Error(errors.WRONG_LOAD_USERS)
    return cUsers
  }

  async companyUserInfo(payload) {
    const {acc, cid, uid} = payload
    const client = await this.db.connect()
    const {rows} = await client.query(
      `SELECT 
        users.user_uid as uid, 
        users.user_fullname as fullname, 
        roles.role_rid as rid, 
        "groups".group_gid as gid, 
        users.user_email email, 
        users.deleted_at
      FROM users
      LEFT OUTER JOIN roles
      ON users.user_role_id = roles.role_id
      LEFT OUTER JOIN "groups"
      ON users.user_group_id = "groups".group_id
      WHERE user_company_id=$1 and user_uid=$2::character varying;`,
      [cid, uid]
    )

    client.release()
    const cUserInfo = rows.length ? rows[0] : ''
    //if (!cUserInfo) throw new Error(errors.WRONG_LOAD_USERS)
    return cUserInfo
  }

  async addUser(payload) {
    const {acc, user} = payload
    const {uid, cid, fullname, gid, rid, email = '', password} = user

    if (acc.company_id !== cid || acc.role !== 'admin') {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    const {rows} = await client.query(
      `with ugroup as (
        select group_id id from groups where group_company_id=$2 and group_gid=$4
        ), urole as (
        select role_id id from roles where role_company_id=$2 and role_rid=$5)
        --select id from ugroup
        
        INSERT INTO users (
                user_uid, 
                user_fullname, 
                user_group_id, 
                user_role_id, 
                user_email, 
                user_password,
                user_company_id) 
              VALUES ($1, $3, (select id from ugroup), (select id from urole), $6, crypt($7, gen_salt('bf')), $2) 
              RETURNING user_uid
        ;`,
      [uid, cid, fullname, gid, rid, email, password]
    )

    client.release()
    return rows[0].user_uid
  }

  async updUser(payload) {
    const {acc, user} = payload
    const {
      uid,
      cid,
      fullname,
      gid,
      rid,
      email = '',
      password = ''
    } = user

    
    if (acc.company_id !== cid || acc.role !== 'admin') {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    const {rows} = await client.query(
      `with updated AS(
        UPDATE users 
        SET user_fullname=$3, 
          user_group_id = (select group_id from groups where group_gid=$4 and group_company_id=$2),
          user_role_id = (select role_id from roles where role_rid=$5 and role_company_id=$2),
          user_email = $6,
          user_password = CASE WHEN $7<>'' THEN crypt($7, gen_salt('bf')) ELSE user_password END
        WHERE user_company_id=$2 and user_uid =$1 
        RETURNING 1
        )
        SELECT count(*) upd FROM updated;`,
      [uid, cid, fullname, gid, rid, email, password]
    )

    client.release()
    return +rows[0].upd
  }

  async delUser(payload) {
    const {acc, user} = payload
    const {uid, cid} = user

    if (acc.company_id !== cid || acc.role !== 'admin') {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    const {rows} = await client.query(
      `with deleted AS(
        UPDATE users 
        SET deleted_at = now()::timestamp without time zone 
        WHERE user_company_id=$2 and user_uid =$1::character varying 
        and deleted_at is null
        RETURNING 1
        )
        SELECT count(*) del FROM deleted;`,
      [uid, cid]
    )

    client.release()
    return +rows[0].del
  }
}

module.exports = UserService
