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
      sort = '-series.created_at',
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
    const {timezone, is_admin} = acc

    // if (acc.company_id !== cid || !is_admin) {
    //   throw Error(errors.WRONG_ACCESS)
    // }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        series_id as sid, 
        series_company_id as cid,         
        series_name as name,
        series_period_type as period_type, 
        CASE WHEN series_period_type = 'spec_period' THEN TO_CHAR(series_activity_start::DATE, 'yyyy-mm-dd') 
          WHEN series_period_type = 'user_reg' THEN series_activity_by_user_start::text
          ELSE '' END as activity_start,
          CASE WHEN series_period_type = 'spec_period' THEN TO_CHAR(series_activity_finish::DATE, 'yyyy-mm-dd') 
            WHEN series_period_type = 'user_reg' THEN series_activity_by_user_finish::text
            ELSE '' END as activity_finish,                
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
    let activity_fields = ', series_activity_start, series_activity_finish'

    const {acc, series} = payload
    const {
      cid,
      name,
      period_type = null,
      activity_start = null,
      activity_finish = null
    } = series

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

      switch (period_type) {
        case null:
          break
        case 'spec_period':
          break
        case 'user_reg':
          activity_fields =
            ', series_activity_by_user_start, series_activity_by_user_finish'
          break
        default:
          break
      }

      const query_val =
        period_type === null
          ? [cid, name, period_type, null, null]
          : [cid, name, period_type, activity_start, activity_finish]
      const {rows} = await client.query(
        `INSERT INTO series (series_company_id, series_name, 
          series_period_type ${activity_fields}) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *;`,
        query_val
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

    let activity_fields =
      'series_activity_start = CASE WHEN $5::text IS NOT NULL THEN $5::date ELSE NULL END, \
      series_activity_finish = CASE WHEN $6::text IS NOT NULL THEN $6::date ELSE NULL END, \
      series_activity_by_user_start =  NULL, \
      series_activity_by_user_finish = NULL'

    const {acc, series} = payload
    const {
      sid,
      cid,
      name,
      activity_start = null,
      activity_finish = null,
      period_type = null
    } = series

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

      switch (period_type) {
        case null:
          activity_fields =
            'series_activity_by_user_start = NULL, \
            series_activity_by_user_finish = NULL,  \
            series_activity_start = NULL, \
            series_activity_finish = NULL'
          break
        case 'spec_period':
          break
        case 'user_reg':
          activity_fields =
            'series_activity_by_user_start = CASE WHEN $5::integer IS NOT NULL THEN $5::integer ELSE NULL END, \
            series_activity_by_user_finish = CASE WHEN $6::integer IS NOT NULL THEN $6::integer ELSE NULL END,  \
            series_activity_start = NULL, \
            series_activity_finish = NULL'
          break
      }

      const query_str = `UPDATE series 
      SET series_name=$3, 
      series_period_type = $4,
      ${activity_fields}
      WHERE series_company_id=$2 and series_id =$1
      AND deleted_at IS NULL
      RETURNING *;`

      let query_val = [sid, cid, name, period_type]

      if (period_type !== null) {
        query_val = [...query_val, activity_start, activity_finish]
      }

      client = await this.db.connect()
      const {rows} = await client.query(query_str, query_val)

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
          FROM series, videos 
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
          FROM series, groups 
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
        WHERE series_company_id=$2 and series_id=$1 
        and deleted_at is null
        RETURNING *;`,
        [sid, cid]
      )

      histData.object_name = `s_${sid}`
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
