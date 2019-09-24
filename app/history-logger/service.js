'use strict'
const errors = require('../errors')
const db_api = require('../db_api')

class HistoryLoggerService {
  constructor(db) {
    this.db = db
  }

  makeHistoryQuery(payload) {
    const {
      user_id = null,
      user_uid = null,
      cid = null,
      category,
      action,
      result,
      object_name,
      action_note = null,
      target_data
    } = payload

    return {
      text: `INSERT INTO public.users_history_log 
              (userhist_user_id,  userhist_user_uid, userhist_company_id, 
                userhist_category, userhist_date, userhist_action, 
                userhist_object_name, userhist_action_note,
                userhist_result, userhist_data) 
            values 
              ($1, $2, $3, $4, now(), $5, $6, $7, $8, $9);`,
      values: [
        user_id,
        user_uid,
        cid,
        category,
        action,
        object_name,
        action_note,
        this.resultCheck(result),
        target_data
      ]
    }
  }

  resultCheck(cond) {
    return cond ? 's' : 'f'
  }

  async saveHistoryInfo(options) {
    const client = await this.db.connect()
    const query = this.makeHistoryQuery(options)
    try {
      client.query(query)
    } catch (err) {
      throw Error(err.message)
    } finally {
      client.release()
    }
  }

  async getHistoryInfo(payload) {
    const {acc} = payload
    const {company_id: cid, uid, timezone, is_admin} = acc

    const {
      limit = 'ALL',
      offset = 0,
      sort = '-users_history_log.created_at',
      filter = undefined
    } = payload.query

    const qSort = db_api.sorting(sort, 'history')
    let qFilter = Boolean(filter) ? db_api.filtration(filter, 'history') : ''
    qFilter = db_api.setFilterTz(qFilter, timezone)

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
          userhist_user_uid,
          userhist_category,
          userhist_action,
          created_at AT TIME ZONE $3 AS created_at 
        FROM users_history_log
        WHERE  userhist_company_id = $1 
        AND $4=true
        ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
        [cid, offset, timezone, is_admin]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }
}

module.exports = HistoryLoggerService
