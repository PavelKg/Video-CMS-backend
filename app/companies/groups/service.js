'use strict'
const errors = require('../../errors')

class GroupService {
  constructor(db) {
    this.db = db
  }

  async companyGroups(payload) {
    const {acc, cid} = payload
    const client = await this.db.connect()
    const {rows} = await client.query(
      `SELECT group_gid as gid, group_name as name, deleted_at
      FROM "groups"
      WHERE group_company_id=$1;`,
      [cid]
    )

    client.release()
    return rows
  }

  async addGroup(payload) {
    const {acc, group} = payload
    const {gid, cid, name} = group

    console.log('group=', group, acc)
    if (acc.company_id !== cid || acc.role !== 'admin') {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    const {rows} = await client.query(
      `INSERT INTO groups (group_gid, group_company_id, group_name) 
      VALUES ($1, $2, $3) 
      RETURNING group_gid;`,
      [gid, cid, name]
    )

    client.release()
    return rows[0].group_gid
  }

  async updGroup(payload) {
    const {acc, group} = payload
    const {gid, cid, name} = group

    if (acc.company_id !== cid || acc.role !== 'admin') {
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

    if (acc.company_id !== cid || acc.role !== 'admin') {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
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
