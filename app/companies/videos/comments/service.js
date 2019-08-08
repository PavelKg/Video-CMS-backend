'use strict'
const errors = require('../../../errors')
const db_api = require('../../../db_api')

class CommentService {
  constructor(db) {
    this.db = db
  }

  async videoComments(payload) {
    const {acc, params, query} = payload
    const {cid, uuid} = params
    const {
      limit = 'ALL',
      offset = 0,
      sort = '-comments.created_at',
      filter = undefined
    } = payload.query

    const qSort = db_api.sorting(sort, 'comments')
    const qFilter = Boolean(filter) ? db_api.filtration(filter, 'comments') : ''

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
          comment_video_uuid, 
          comment_company_id,
          comment_id,
          CASE WHEN deleted_at IS NULL THEN comment_text ELSE '' END AS comment_text,
          comment_visible,
          comment_user_uid,
          created_at,
          updated_at,
          deleted_at
        FROM comments
        WHERE  comment_company_id = $1 and comment_video_uuid= $2
        and (comment_visible = true or $3 = true)
        ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $4;`,
        [cid, uuid, acc.is_admin, offset]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async commentInfo(payload) {
    const {acc, params} = payload
    const {cid, uuid, comid} = params

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
          comment_video_uuid, 
          comment_company_id,
          comment_id,
          CASE WHEN deleted_at IS NULL THEN comment_text ELSE '' END AS comment_text,
          comment_visible,
          comment_user_uid,
          created_at,
          updated_at,
          deleted_at
        FROM comments
        WHERE  comment_company_id = $1 
          AND comment_video_uuid= $2 AND comment_id = $3;`,
        [cid, uuid, comid]
      )
      return rows[0]
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async addComment(payload) {
    const {acc, comment} = payload
    const {uuid, cid, comment_text} = comment
    const {uid} = acc
    if (acc.company_id !== cid) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `WITH adv_info AS (
          SELECT 
            (SELECT user_id FROM users WHERE user_uid = $2 AND user_company_id=$1),
            (SELECT video_id FROM videos WHERE video_uuid=$3 AND video_company_id=$1)
        )

        INSERT INTO comments (comment_uid, comment_user_uid, 
            comment_company_id, comment_vid, comment_video_uuid, 
            comment_text, comment_visible) 
          SELECT user_id, $2,  $1, 
            video_id, $3, $4, true 
          FROM  adv_info
          RETURNING comment_id
        ;`,
        [cid, uid, uuid, comment_text]
      )
      console.log('rows[0]=', rows[0])
      return rows[0].comment_id
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }
  async updMessageVisible(payload) {
    const {acc, comment} = payload
    const {value, cid, uuid, comid} = comment

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const query = {
        text: `UPDATE comments SET comment_visible = $4
         WHERE comment_company_id=$1 AND comment_video_uuid=$2 AND comment_id=$3`,
        values: [cid, uuid, comid, Boolean(value)]
      }
      const {rowCount} = await client.query(query)
      return rowCount
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }

  async delComment(payload) {
    const {acc, comment} = payload
    const {cid, uuid, comid} = comment

    if (acc.company_id !== cid) {
       throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {

      const query_check = {
        text: `SELECT comment_id FROM comments 
         WHERE comment_company_id=$1 AND comment_video_uuid=$2 
          AND comment_id=$3 AND deleted_at is not null`,
        values: [cid, uuid, comid]
      }
      const cntDeleted = await client.query(query_check)
      
      if (cntDeleted.rowCount>0) {
        return 0
      }
      console.log('acc=', acc)
      const query = {
        text: `UPDATE comments SET 
         deleted_at = now()::timestamp without time zone 
         WHERE comment_company_id=$1 
          AND comment_video_uuid=$2 
          AND comment_id=$3
          AND ($4 = true OR ($1=$5 AND comment_user_uid = $6))`,
        values: [cid, uuid, comid, acc.is_admin, acc.company_id, acc.uid]
      }
      const {rowCount} = await client.query(query)
      return rowCount
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }
}

module.exports = CommentService
