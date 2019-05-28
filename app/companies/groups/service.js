'use strict'
const errors = require('../../errors')
const db_api = require('../../db_api')

class GroupService {
  constructor(db) {
    this.db = db
  }

  async companyGroups(payload) {
    const {acc, cid} = payload
    const {limit='ALL' , offset=0, sort='group_gid', filter=''} = payload.query

    const qSort = db_api.sorting(sort, 'groups')
    const qFilter = filter !== '' ? db_api.filtration(filter, 'groups') : ''

    const client = await this.db.connect()
    const {rows} = await client.query(
      `SELECT group_gid as gid, group_name as name, deleted_at
      FROM "groups"
      WHERE group_company_id=$1 ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
      [cid, offset]
    )

    client.release()
    return rows
  }

  async addGroup(payload) {
    const {acc, group} = payload
    const {cid, name} = group

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    const {rows} = await client.query(
      `INSERT INTO groups (group_company_id, group_name) 
      VALUES ($1, $2) 
      RETURNING group_gid;`,
      [cid, name]
    )

    client.release()
    return rows[0].group_gid
  }

  async updGroup(payload) {
    const {acc, group} = payload
    const {gid, cid, name} = group

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    const {rows} = await client.query(
      `with updated AS(
        UPDATE groups 
        SET group_name=$3 
        WHERE group_company_id=$2 and group_gid =$1
        and deleted_at is null 
        RETURNING 1
        )
        SELECT count(*) upd FROM updated;`,
      [gid, cid, name]
    )

    client.release()
    return +rows[0].upd
  }

  async delGroup(payload) {
    const {acc, group} = payload
    const {gid, cid} = group

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    const {rows: usrs} = await client.query(
      `select count(users.user_id) cnt 
       from groups, users 
       where group_company_id=$2 and group_gid=$1 
        and user_group_id = group_gid;`, 
        [gid, cid]
    )
    if (Array.isArray(usrs) && usrs[0].cnt > 0) {
      throw Error(errors.CANNOT_DELETE_A_GROUP_WITH_EXISTING_USERS)
    }

    const {rows} = await client.query(
      `with deleted AS(
        UPDATE groups 
        SET deleted_at = now()::timestamp without time zone 
        WHERE group_company_id=$2 and group_gid =$1 
        and deleted_at is null
        RETURNING 1
        )
        SELECT count(*) del FROM deleted;`,
      [gid, cid]
    )

    client.release()
    return +rows[0].del
  }
}

module.exports = GroupService
