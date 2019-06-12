'use strict'
const errors = require('../errors')
const db_api = require('../db_api')

class MessageService {
  constructor(db) {
    this.db = db
  }

  async userMessages(payload) {
    const {acc} = payload
    const cid = acc.company_id
    const uid = acc.uid
    const {
      limit = 'ALL',
      offset = 0,
      sort = 'message_id',
      filter = undefined
    } = payload.query

    const qSort = db_api.sorting(sort, 'messages')
    const qFilter = Boolean(filter) ? db_api.filtration(filter, 'messages') : ''

    const client = await this.db.connect()
    const {rows} = await client.query(
      `SELECT mes.*, 
      CASE WHEN starred_messages_id IS NOT null THEN true
        ELSE false
        END as starred 
      FROM (SELECT message_id as mid, 
              send_users.user_uid as sender_uid, send_users.user_company_id as sender_cid ,send_comp.company_name as sender_cname,
              rec_users.user_uid as receiver_uid, rec_users.user_company_id as receiver_cid ,rec_comp.company_name as receiver_cname,
              message_subject as subject,
              message_text as text, 
              messages.created_at, messages.deleted_at
            FROM "messages", users as rec_users, companies as rec_comp, users as send_users, companies as send_comp
            WHERE (
              (send_users.user_company_id=$1 and send_users.user_uid=$2) 
              or 
              (rec_users.user_company_id=$1 and rec_users.user_uid=$2)
            )
            and send_comp.company_id=send_users.user_company_id 
            and rec_comp.company_id=rec_users.user_company_id
            and (message_receiver=rec_users.user_id and message_sender=send_users.user_id)
          ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $3) AS mes
      LEFT OUTER JOIN messages_starred
      ON mid=starred_messages_id AND starred_user_id = 
          (select user_id from users where user_uid=$2 and user_company_id=$1);`,
      [cid, uid, offset]
    )

    client.release()
    return rows
  }

  async userMessagesReceivers(payload) {
    const {acc} = payload
    const cid = acc.company_id

    const client = await this.db.connect()
    const {rows} = await client.query(
      `SELECT user_uid as uid, user_company_id as cid 
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

    const client = await this.db.connect()
    const {rows} = await client.query(
      `WITH sender AS (
        select user_id from users where user_company_id=$3 and user_uid=$4
      ),
      receiver AS (
        select user_id from users where user_company_id=$1 and user_uid=$2
      )

      INSERT INTO messages ( message_sender, message_receiver,
          message_subject, message_text) 
      SELECT sender.user_id, receiver.user_id, $5, $6 FROM sender, receiver  
      RETURNING message_id;`,
      [
        receiver_cid,
        receiver_uid,
        sender_cid,
        sender_uid,
        subject,
        text
      ]
    )
    client.release()
    if (rows.length === 0) {
      throw Error(errors.MESSAGE_RECEIVER_NOT_FOUND)
    }
    return rows[0].message_id
  }

  async delMessage(payload) {
    const {acc, message} = payload
    const {mid} = message

    // if (acc.company_id !== cid || !acc.is_admin) {
    //   throw Error(errors.WRONG_ACCESS)
    // }

    const client = await this.db.connect()
    const {rows} = await client.query(
      `with deleted AS(
        UPDATE messages 
        SET deleted_at = now()::timestamp without time zone 
        WHERE message_id=$1
        and deleted_at is null
        RETURNING 1
        )
        SELECT count(*) del FROM deleted;`,
      [mid]
    )

    client.release()
    return +rows[0].del
  }

  async addStarredMessage(payload) {
    const {acc, mid} = payload
    const {uid, company_id} = acc

    const client = await this.db.connect()
    try {
      const {rowCount} = await client.query(
        `INSERT INTO messages_starred 
          (starred_messages_id, starred_user_id, starred_company_id) 
          SELECT $1, user_id, user_company_id FROM users 
          WHERE user_uid=$2 AND user_company_id=$3;`,
        [mid, uid, company_id]
      )
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
      client.release()
    }
  }
  async delStarredMessage(payload) {
    const {acc, mid} = payload
    const {uid, company_id} = acc

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
      return rowCount
    } catch (err) {
      throw Error(err.message)
    } finally {
      client.release()
    }
  }
}

module.exports = MessageService
