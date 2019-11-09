'use strict'
const errors = require('../../errors')
const db_api = require('../../db_api')

class SeriesService {
  constructor(db, histLogger) {
    this.db = db
    this.history_category = 'Series'
    this.histLogger = histLogger
  }

  async companySeries(payload) {
    const {acc, cid} = payload
    const {timezone} = acc
    const {
      limit = 'ALL',
      offset = 0,
      sort = 'series_id',
      filter = ''
    } = payload.query

    const qSort = db_api.sorting(sort, 'series')
    let qFilter = filter !== '' ? db_api.filtration(filter, 'series') : ''
    qFilter = db_api.setFilterTz(qFilter, timezone)

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        series_id as sid, 
        series_company_id as cid,         
        series_name as name, 
        deleted_at AT TIME ZONE $3 AS deleted_at
      FROM "series"
      WHERE series_company_id=$1 ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
        [cid, offset, timezone]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async companySeriesById(payload) {
    const {acc, cid, sid} = payload
    const {timezone} = acc
    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        series_id as sid, 
        series_company_id as cid,         
        series_name as name, 
        TO_CHAR(series_activity_start::DATE, 'yyyy-mm-dd') as activity_start,
        TO_CHAR(series_activity_finish::DATE, 'yyyy-mm-dd') as activity_finish,                
        deleted_at AT TIME ZONE $3 AS deleted_at
      FROM "series"
      WHERE series_company_id=$1 and series_id=$2;`,
        [cid, sid, timezone]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async addSeries(payload) {
    let client = undefined
    const {acc, series} = payload
    const {cid, name} = series

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'created',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: name,
      details: 'Failure',
      target_data: {...series}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const {rows} = await client.query(
        `INSERT INTO series (series_company_id, series_name) 
        VALUES ($1, $2) 
        RETURNING *;`,
        [cid, name]
      )
      histData.result = typeof rows[0] === 'object'
      histData.object_name = `s_${rows[0].series_id}`
      histData.target_data = {...histData.target_data, sid: rows[0].series_id}
      histData.details = 'Success'

      return rows[0].series_id
    } catch (error) {
      throw Error(error.message)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async updSeries(payload) {
    let client = undefined
    const {acc, series} = payload
    const {sid, cid, name, activity_start = '', activity_finish = '', period_type} = series

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'edited',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: name,
      details: 'Failure [name]',
      target_data: {...series}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const {rows} = await client.query(
        `UPDATE series 
          SET series_name=$3, 
          series_activity_start = CASE WHEN $4<>'' THEN $8::date ELSE null END,
          series_activity_finish = CASE WHEN $5<>'' THEN $9::date ELSE null END
          WHERE series_company_id=$2 and series_id =$1
          AND deleted_at IS NULL
          RETURNING *;`,
        [sid, cid, name, activity_start, activity_finish]
      )

      histData.object_name = `s_${rows[0].series_id}`
      histData.result = rows.length === 1
      histData.details = `[${name}] information updated`
      return rows.length
    } catch (error) {
      throw Error(error.message)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async delSeries(payload) {
    let client = undefined
    const {acc, series} = payload
    const {sid, cid} = series

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'deleted',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure',
      target_data: {...series}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const {rows: vsrs} = await client.query(
        `SELECT count(videos.video_id) cnt 
          FROM seriess, videos 
          WHERE series_company_id=$2 AND series_id=$1 
            AND series_id = ANY(video_series) 
            AND videos.deleted_at is null;`,
        [sid, cid]
      )
      if (Array.isArray(vsrs) && vsrs[0].cnt > 0) {
        throw Error(errors.CANNOT_DELETE_A_SERIES_WITH_EXISTING_VIDEOS)
      }
      const {rows: gsrs} = await client.query(
        `SELECT count(groups.group_gid) cnt 
          FROM seriess, groups 
          WHERE series_company_id=$2 AND series_id=$1 
            AND series_id = ANY(group_series) 
            AND groups.deleted_at is null;`,
        [sid, cid]
      )

      if (Array.isArray(gsrs) && gsrs[0].cnt > 0) {
        throw Error(errors.CANNOT_DELETE_A_SERIES_WITH_EXISTING_GROUPS)
      }

      const {rows} = await client.query(
        `UPDATE series 
        SET deleted_at = now()
        WHERE series_company_id=$2 and series_id =$1 
        and deleted_at is null
        RETURNING *;`,
        [sid, cid]
      )

      histData.object_name = `s_${rows[0].series_sid}`
      histData.result = rows.length === 1
      histData.details = 'Success'
      return rows.length
    } catch (error) {
      throw Error(error.message)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }
}

module.exports = SeriesService
