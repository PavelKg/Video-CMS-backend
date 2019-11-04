'use strict'
const errors = require('../errors')
const db_api = require('../db_api')

class CompanyService {
  constructor(db, histLogger) {
    this.db = db
    this.history_category = 'Companies'
    this.histLogger = histLogger
  }

  async setCommentsBoxState(playload) {
    const {acc, params} = playload
    const {cid, state} = params
    const {user_id, company_id, uid} = acc

    let client = undefined

    let histData = {
      category: this.history_category,
      action: 'Comment Box Visible',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failed',
      target_data: {commentBox: state}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const query = {
        text: `UPDATE companies SET company_commentbox_visible = $2
         WHERE company_id=$1 
         RETURNING company_id`,
        values: [cid, state === 'display']
      }
      const {rows} = await client.query(query)

      histData.object_name = rows[0].company_id
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

  async updLogo(playload) {
    const {acc, body, cid} = playload
    const {data} = body
    const {user_id, company_id, uid} = acc

    let client = undefined

    let histData = {
      category: this.history_category,
      action: 'logo',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failed',
      target_data: {action: 'Change logo'}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const query = {
        text: `UPDATE companies SET company_logo = $2
         WHERE company_id=$1 
         RETURNING company_id`,
        values: [cid, data]
      }
      const {rows} = await client.query(query)

      histData.object_name = rows[0].company_id
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

  async getLogo(playload) {
    const {acc, cid} = playload

    let client = undefined

    try {
      if (acc.company_id !== cid) {
        throw Error(errors.WRONG_ACCESS)
      }
      client = await this.db.connect()
      const query = {
        text: `SELECT company_logo AS data 
         FROM companies 
         WHERE company_id=$1`,
        values: [cid]
      }
      const {rows} = await client.query(query)

      return rows[0]
    } catch (error) {
      throw Error(error)
    } finally {
      if (client) {
        client.release()
      }
    }
  }
}

module.exports = CompanyService
