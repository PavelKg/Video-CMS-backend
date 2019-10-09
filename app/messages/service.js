'use strict'
const errors = require('../errors')
const db_api = require('../db_api')

class MessageService {
  constructor(db, histLogger) {
    this.db = db
    this.history_category = 'Messages'
    this.histLogger = histLogger
  }

  async userMessages(payload) {
    const {acc, direction} = payload
    //const cid = acc.company_id
    const {uid, company_id: cid, timezone} = acc
    const {
      limit = 'ALL',
      offset = 0,
      sort = '-mid',
      filter = undefined
    } = payload.query

    const qSort = db_api.sorting(sort, 'messages')
    let qFilter = Boolean(filter) ? db_api.filtration(filter, 'messages') : ''
    qFilter = db_api.setFilterTz(qFilter, timezone)

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT mid,
        message_cp_uid AS cp_uid,
        message_cp_cid AS cp_cid,
        message_cp_cname AS cp_cname,
        subject,
        text,
        starred,
        created_at AT TIME ZONE $4 AS created_at,
        deleted_at AT TIME ZONE $4 AS deleted_at 
        FROM vw_messages_${direction}
        WHERE message_own_uid = $2 and message_own_cid = $1 and deleted_at IS NULL 
        ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $3;`,
        [cid, uid, offset, timezone]
      )

      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async userMessagesReceivers(payload) {
    const {acc} = payload
    const cid = acc.company_id

    const client = await this.db.connect()
    const {rows} = await client.query(
      `SELECT 
        user_uid as uid, 
        user_company_id as cid 
      FROM users 
      WHERE user_company_id=$1 and users.deleted_at is null 
      ORDER BY user_company_id, user_uid;`,
      [cid]
    )

    client.release()
    return rows
  }

  async addMessage(payload) {
    const {acc, message} = payload
    const sender_cid = acc.company_id
    const sender_uid = acc.uid
    const {receiver_cid, receiver_uid, subject, text, important} = message

    let histData = {
      category: this.history_category,
      action: 'posted',
      result: false,
      object_name: receiver_uid
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `WITH sender AS (
        select user_id from users where user_company_id=$3 and user_uid=$4
      ),
      receiver AS (
        select user_id from users where user_company_id=$1 and user_uid=$2
      )

      INSERT INTO messages ( message_sender, message_receiver,
          message_subject, message_text, message_receiver_uid, message_sender_uid) 
      SELECT sender.user_id, receiver.user_id, $5, $6, $2, $4 FROM sender, receiver  
      RETURNING *;`,
        [receiver_cid, receiver_uid, sender_cid, sender_uid, subject, text]
      )

      histData = {
        ...histData,
        user_id: rows[0].message_sender,
        user_uid: sender_uid,
        cid: sender_cid,
        result: rows.length === 1,
        target_data: {message: rows[0].message_id}
      }

      if (rows.length === 0) {
        throw Error(errors.MESSAGE_RECEIVER_NOT_FOUND)
      }
      return rows[0].message_id
    } catch (error) {
      throw Error(error.message)
    } finally {
      this.histLogger.saveHistoryInfo(histData)
      client.release()
    }
  }

  async delMessage(payload) {
    const {acc, mid, direction} = payload
    const dir_target = direction === 'inbox' ? 'receiver' : 'sender'
    const dir_oposit = direction === 'inbox' ? 'sender' : 'receiver'

    const {uid, company_id: cid, user_id} = acc
    let histData = {
      category: this.history_category,
      action: 'deleted',
      result: false,
      user_id,
      user_uid: uid,
      cid: cid,
      target_data: {message: mid}
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `WITH acc_user AS ( 
          SELECT user_id 
          FROM users 
          WHERE user_uid=$2 and user_company_id=$3
        )

        UPDATE messages 
        SET message_${dir_target}_deleted_at = now() 
        WHERE message_id=$1
        AND message_${dir_target} = (select user_id from acc_user)
        AND message_${dir_target}_deleted_at is null 
        RETURNING *;`,
        [mid, uid, cid]
      )
      histData.result = rows.length === 1
      histData.object_name = rows[0][`message_${dir_oposit}_uid`]

      return rows.length
    } catch (error) {
      throw Error(error.message)
    } finally {
      this.histLogger.saveHistoryInfo(histData)
      client.release()
    }
  }

  async addStarredMessage(payload) {
    const {acc, mid} = payload
    const {uid, company_id, user_id} = acc

    let histData = {
      category: this.history_category,
      action: 'starred',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: uid,
      target_data: {message: mid}
    }

    const client = await this.db.connect()
    try {
      const {rowCount} = await client.query(
        `INSERT INTO messages_starred 
          (starred_messages_id, starred_user_id, starred_company_id) 
          SELECT $1, user_id, user_company_id FROM users 
          WHERE user_uid=$2 AND user_company_id=$3;`,
        [mid, uid, company_id]
      )
      histData.result = rowCount === 1
      return rowCount
    } catch (err) {
      switch (err.code) {
        case '23505':
          throw Error(errors.MESSAGE_ALREADY_STARRED)
          break
        default:
          throw Error(err.message)
          break
      }
    } finally {
      this.histLogger.saveHistoryInfo(histData)
      client.release()
    }
  }
  async delStarredMessage(payload) {
    const {acc, mid} = payload
    const {uid, company_id, user_id} = acc

    let histData = {
      category: this.history_category,
      action: 'unstarred',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: uid,
      target_data: {message: mid}
    }

    const client = await this.db.connect()
    try {
      const {rows, rowCount} = await client.query(
        `DELETE FROM messages_starred 
         WHERE starred_messages_id=$1 AND starred_user_id=(
          SELECT user_id FROM users 
          WHERE user_uid=$2 AND user_company_id=$3
         );`,
        [mid, uid, company_id]
      )
      histData.result = rowCount === 1
      return rowCount
    } catch (err) {
      throw Error(err.message)
    } finally {
      this.histLogger.saveHistoryInfo(histData)
      client.release()
    }
  }
}

module.exports = MessageService
