'use strict'
const errors = require('../../../errors')
const db_api = require('../../../db_api')

class CommentService {
  constructor(db, histLogger) {
    this.db = db
    this.history_category = 'Comments'
    this.histLogger = histLogger
  }

  async videoComments(payload) {
    const {autz, params, query} = payload
    const {cid, uuid} = params
    const {timezone, is_admin} = autz
    const {
      limit = 'ALL',
      offset = 0,
      sort = '-comments.created_at',
      filter = undefined
    } = payload.query

    const qSort = db_api.sorting(sort, 'comments')
    let qFilter = Boolean(filter) ? db_api.filtration(filter, 'comments') : ''
    qFilter = db_api.setFilterTz(qFilter, timezone)

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
          created_at AT TIME ZONE $5 AS created_at, 
          updated_at AT TIME ZONE $5 AS updated_at,           
          deleted_at AT TIME ZONE $5 AS deleted_at 
        FROM comments
        WHERE  comment_company_id = $1 and comment_video_uuid= $2
        and (comment_visible = true or $3 = true)
        ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $4;`,
        [cid, uuid, is_admin, offset, timezone]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async commentInfo(payload) {
    const {autz, params} = payload
    const {cid, uuid, comid} = params
    const {timezone} = autz

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
          created_at AT TIME ZONE $4 AS created_at, 
          updated_at AT TIME ZONE $4 AS updated_at,           
          deleted_at AT TIME ZONE $4 AS deleted_at 
        FROM comments
        WHERE  comment_company_id = $1 
          AND comment_video_uuid= $2 AND comment_id = $3;`,
        [cid, uuid, comid, timezone]
      )
      return rows[0]
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async addComment(payload) {
    let client = undefined
    const {autz, comment} = payload
    const {uuid, cid, comment_text} = comment
    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'created',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: uuid,
      details: 'Failure',
      target_data: {...comment}
    }

    try {
      if (autz.company_id !== cid) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
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
          RETURNING *;`,
        [cid, uid, uuid, comment_text]
      )
      histData.object_name = `v_${rows[0].comment_vid}`
      histData.result = typeof rows[0] === 'object'
      histData.details = 'Success'
      return rows[0].comment_id
    } catch (error) {
      throw Error(error.message)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }
  async updMessageVisible(payload) {
    let client = undefined
    const {autz, comment} = payload
    const {value, cid, uuid, comid} = comment

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: value ? `display` : 'hide',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: uuid,
      details: 'Failure',
      target_data: {...comment}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const query = {
        text: `UPDATE comments SET comment_visible = $4
         WHERE comment_company_id=$1 AND comment_video_uuid=$2 AND comment_id=$3
         RETURNING *;`,
        values: [cid, uuid, comid, Boolean(value)]
      }

      const {rows} = await client.query(query)
      histData.object_name = `v_${rows[0].comment_vid}`
      histData.result = rows.length === 1
      histData.details = Boolean(value)
        ? 'Comment has been display'
        : 'Comment has been hidden'
      return rows.length
    } catch (error) {
      throw Error(error)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async delComment(payload) {
    let client = undefined
    const {autz, comment} = payload
    const {cid, uuid, comid} = comment

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'deleted',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: uuid,
      details: 'Failure',
      target_data: {...comment}
    }

    try {
      if (autz.company_id !== cid) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const query_check = {
        text: `SELECT comment_id FROM comments 
         WHERE comment_company_id=$1 AND comment_video_uuid=$2 
          AND comment_id=$3 AND deleted_at is not null;`,
        values: [cid, uuid, comid]
      }
      const cntDeleted = await client.query(query_check)

      if (cntDeleted.rowCount > 0) {
        return 0
      }

      const query = {
        text: `UPDATE comments SET 
         deleted_at = now()
         WHERE comment_company_id=$1 
          AND comment_video_uuid=$2 
          AND comment_id=$3
          AND ($4 = true OR ($1=$5 AND comment_user_uid = $6))
          RETURNING *;`,
        values: [cid, uuid, comid, autz.is_admin, autz.company_id, autz.uid]
      }
      const {rows} = await client.query(query)
      histData.object_name = `v_${rows[0].comment_vid}`
      histData.result = rows.length === 1
      histData.details = 'Success'
      return rows.length
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

module.exports = CommentService
