'use strict'
const errors = require('../../errors')

class UserService {
  constructor(db) {
    this.db = db
  }

  async companyUsers(payload) {
    const {acc, cid} = payload
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
      WHERE user_company_id=$1;`,
      [cid]
    )

    client.release()
    const cUsers = rows

    //if (!cUsers) throw new Error(errors.WRONG_LOAD_USERS)
    return cUsers
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
        select group_id id from groups where group_company_id=2 and group_gid='newGr5'
        ), urole as (
        select role_id id from roles where role_company_id=2 and role_rid='admin')
        --select id from ugroup
        
        INSERT INTO users (
                user_uid, 
                user_fullname, 
                user_group_id, 
                user_role_id, 
                user_email, 
                user_password,
                user_company_id) 
              VALUES ('testUUU', 'testFullName', (select id from ugroup), (select id from urole), '', '7236472'::bytea, 2) 
              RETURNING user_uid
        ;`,
      [uid, cid, fullname, gid, rid, email, password]
    )

    client.release()
    return rows[0].user_uid
  }

  async updUser(payload) {
    const {acc, user} = payload
    const {uid, cid, name, is_admin = false} = user

    if (acc.company_id !== cid || acc.role !== 'admin') {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    const {rows} = await client.query(
      `with updated AS(
        UPDATE users 
        SET user_name=$3, user_is_admin=$4 
        WHERE user_company_id=$2 and user_uid =$1 
        RETURNING 1
        )
        SELECT count(*) upd FROM updated;`,
      [uid, cid, name, is_admin]
    )

    client.release()
    return +rows[0].upd
  }

  async delUser(payload) {
    const {acc, user} = payload
    const {uid, cid} = user

    console.log('acc=', acc)

    if (acc.company_id !== cid || acc.role !== 'admin') {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    const {rows} = await client.query(
      `with deleted AS(
        UPDATE users 
        SET deleted_at = now()::timestamp without time zone 
        WHERE user_company_id=$2 and user_uid =$1 
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
