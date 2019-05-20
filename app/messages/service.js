'use strict'
const errors = require('../errors')
const db_api = require('../db_api')

class MessageService {
  constructor(db) {
    console.log('message-constructor')
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
      `SELECT message_id as mid, message_sender as sender,
        message_receiver as receiver, message_subject as subject,
        message_text as text, message_important as important,
        messages.created_at, messages.deleted_at
      FROM "messages", users
      WHERE user_company_id=$1 and user_uid=$2 
        and (message_receiver=user_id or message_sender=user_id) ${qFilter} 
        ORDER BY ${qSort} LIMIT ${limit} OFFSET $3;`,
      [cid, uid, offset]
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
          message_subject, message_text, message_important) 
      SELECT sender.user_id, receiver.user_id, $5, $6, $7 FROM sender, receiver  
      RETURNING message_id;`,
      [
        receiver_cid,
        receiver_uid,
        sender_cid,
        sender_uid,
        subject,
        text,
        important
      ]
    )
    client.release()
    if (rows.length === 0 ) {
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
}

module.exports = MessageService
