'use strict'

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
      target_data
    } = payload

    return {
      text: `INSERT INTO public.users_history_log 
              (userhist_user_id,  userhist_user_uid, userhist_company_id, 
                userhist_category, userhist_date, userhist_action, 
                userhist_result, userhist_data) 
            values 
              ($1, $2, $3, $4, now(), $5, $6, $7);`,
      values: [
        user_id,
        user_uid,
        cid,
        category,
        action,
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
}
module.exports = HistoryLoggerService
