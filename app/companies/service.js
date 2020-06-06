'use strict'
const errors = require('../errors')
const db_api = require('../db_api')

class CompanyService {
  constructor(db, histLogger) {
    this.db = db
    this.history_category = 'Companies'
    this.histLogger = histLogger
  }

  async setVideoInfoLocation(payload) {
    const {autz, location, params} = payload
    const {cid} = params
    const {user_id, company_id, uid} = autz

    let client = undefined

    let histData = {
      category: this.history_category,
      action: 'Video Info Location',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failed',
      target_data: {location}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const query = {
        text: `UPDATE companies SET company_video_info_location_bottom = $2
         WHERE company_id=$1 
         RETURNING company_id`,
        values: [cid, location === 'bottom']
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

  async getVideoInfoLocation(playload) {
    const {autz, cid} = playload

    let client = undefined

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }
      client = await this.db.connect()
      const query = {
        text: `SELECT CASE 
          WHEN company_video_info_location_bottom = true THEN 'bottom' 
          ELSE 'next' END AS location 
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

  async setCommentsBoxState(playload) {
    const {autz, params} = playload
    const {cid, state} = params
    const {user_id, company_id, uid} = autz

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
      if (autz.company_id !== cid || !autz.is_admin) {
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

  async getCommentsBoxState(playload) {
    const {autz, cid} = playload

    let client = undefined

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }
      client = await this.db.connect()
      const query = {
        text: `SELECT company_commentbox_visible AS visible 
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

  async updLogo(playload) {
    const {autz, body, cid} = playload
    const {data} = body
    const {user_id, company_id, uid} = autz

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
      if (autz.company_id !== cid || !autz.is_admin) {
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
    const {autz, cid} = playload

    let client = undefined

    try {
      if (autz.company_id !== cid) {
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
