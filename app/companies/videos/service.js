'use strict'
const errors = require('../../errors')
const db_api = require('../../db_api')

const service_domain = 'p-stream.jp'

class VideoService {
  constructor(db, gcs, histLogger) {
    this.db = db
    this.gcs = gcs
    this.history_category = 'Videos'
    this.histLogger = histLogger
  }

  /**
   * Signed URLs (query string authentication)
   * Get signed url of a private file in GCS.
   * By default, the private link is for read action and it will expire in 1 day.
   *
   * @param {string} bucketName
   * @param {Object} [options]
   * @return {Promise.}
   */

  async videosGcsUploadSignedUrl(payload) {
    const {acc, query} = payload
    const storage_type = 'gcs'
    const {name, size, type, uuid} = query
    const title = name.match(/^(.+).[\w]{3,4}$/iu)[1]

    const {user_id, company_id: cid, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'registered',
      result: false,
      user_id,
      user_uid: uid,
      cid,
      object_name: '00000',
      details: `Failure [${title}]`,
      target_data: {...query}
    }

    let storage_bucket_input = ''
    let storage_bucket_output = ''
    let client = undefined
    try {
      if (!this.gcs) {
        throw Error(errors.WRONG_CONNECT_TO_GCS)
      }

      client = await this.db.connect()

      const {rows} = await client.query(
        `SELECT storage_bucket_input, storage_bucket_output, storage_content_limit 
        FROM storages, companies
        WHERE company_storage_id = storage_id and company_id=$1 
          and upper(storage_type)=upper($2)`,
        [cid, storage_type]
      )

      storage_bucket_input = rows[0].storage_bucket_input
      storage_bucket_output = rows[0].storage_bucket_output
      const storage_content_limit = rows[0].storage_content_limit
      const {rows: insRows} = await client.query(
        `INSERT INTO videos (video_filename, video_type, video_filesize,
        video_uuid, video_status, video_bucket_input, 
        video_bucket_output,video_company_id, video_public, video_title)
       values ($1, $2, $3, $4, 'create', $5, $6, $7, false, $8)
       RETURNING video_id;`,
        [
          name,
          type,
          size,
          uuid,
          storage_bucket_input,
          storage_bucket_output,
          cid,
          title ? title : ''
        ]
      )
      histData.object_name = `v_${insRows[0].video_id}`
      histData.result = insRows.length === 1
      histData.details = `Success [${title}]`
      //return insRows.length
    } catch (error) {
      console.log('error=', error)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }

    const options = {
      action: 'write',
      expires: Date.now() + 1000 * 60 * 60, // One hour
      contentType: type
    }

    const bucket = this.gcs.bucket(storage_bucket_input)
    const check_ext = name.match(/\.(\w)*$/i)
    const file_ext = Array.isArray(check_ext) ? check_ext[0] : ''

    const gcs_file = bucket.file(`${uuid}${file_ext}`)
    const url = (await gcs_file.getSignedUrl(options))[0]
    return {name, url, uuid}
  }

  /**
   * Signed Policy Documents
   * Get Signed Policy Documents for upload to bucket.
   * By default, the private link is for read action and it will expire in 1 day.
   *
   * @param {string} bucketName
   * @param {Object} [options]
   * @return {Promise.}
   */

  // async videosGcsUploadSignedPolicy(payload) {
  //   if (!this.gcs) {
  //     throw Error(errors.WRONG_CONNECT_TO_GCS)
  //   }

  //   var options = {
  //     equals: ['$Content-Type', 'image/jpeg'],
  //     action: 'write',
  //     expires: Date.now() + 1000 * 60 * 60, // one hour
  //     contentLengthRange: {
  //       min: 0,
  //       max: 1024
  //     }
  //   }

  //   const bucket = this.gcs.bucket('p-stream-test')
  //   const file = bucket.file('something.jpg')
  //   const [url] = await file.getSignedPolicy(options)
  //   console.log('file=', url)

  //   return {url: url}
  // }

  async videosCatalog(payload) {
    const {acc} = payload
    const {company_id: cid, uid, timezone, is_admin} = acc

    const {
      limit = 'ALL',
      offset = 0,
      sort = '-videos.updated_at',
      filter = undefined
    } = payload.query

    const onlyPublic = !Boolean(is_admin)
      ? ` AND video_public = true AND video_status='ready' AND videos.deleted_at IS NULL`
      : ''

    const qSort = db_api.sorting(sort, 'videos')
    let qFilter = Boolean(filter) ? db_api.filtration(filter, 'videos') : ''
    qFilter = db_api.setFilterTz(qFilter, timezone)

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `WITH user_group AS (
          select user_groups AS groups, created_at AS reg_date from users where user_company_id=$1 and user_uid=$4
        ),

        user_series AS (
          select array_agg (c) AS useries
			    from (select ser from (select unnest(group_series) AS ser
                from groups 
                where group_company_id=$1 
                  and group_gid in (select unnest(groups) from user_group where groups IS NOT null)
                  and group_series IS NOT null ) bbb, series, user_group 
                  where series_id = ser 
                    AND (series_period_type is null OR 
                      (series_period_type='spec_period' AND now()::date between series_activity_start::date and series_activity_finish::date) OR 
                      (series_period_type='user_reg' AND 
                       now()::date between CASE WHEN series_activity_by_user_start IS NULL THEN now()::date ELSE user_group.reg_date::date + series_activity_by_user_start END
                          AND CASE WHEN series_activity_by_user_finish IS NULL THEN now()::date ELSE user_group.reg_date::date + series_activity_by_user_finish END)
                     )
                  ) as dt(c)
        )

        SELECT 
          'v_'||video_id AS video_id,
          video_uuid,
          video_status,
          video_public,
          video_title,
          created_at AT TIME ZONE $3 AS created_at, 
          updated_at AT TIME ZONE $3 AS updated_at,           
          deleted_at AT TIME ZONE $3 AS deleted_at
        FROM videos
        WHERE  video_company_id = $1 
        AND ((video_groups && (select groups from user_group) OR 
              video_series && (select useries from user_series)) 
            OR $5=true)
        ${onlyPublic}
        ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
        [cid, offset, timezone, uid, is_admin]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async getVideo(payload) {
    // get videos data for uuid
    const {acc, cid, uuid} = payload
    const {timezone, is_admin, uid} = acc
    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `WITH user_group AS (
          select user_groups AS groups, created_at AS reg_date from users where user_company_id=$1 and user_uid=$5
        ),

        user_series AS (
          select array_agg (c) AS useries
			    from (select ser from (select unnest(group_series) AS ser
                from groups 
                where group_company_id=$1 
                  and group_gid in (select unnest(groups) from user_group where groups IS NOT null)
                  and group_series IS NOT null ) bbb, series, user_group 
                  where series_id = ser 
                    AND (series_period_type is null OR 
                      (series_period_type='spec_period' AND now()::date between series_activity_start::date and series_activity_finish::date) OR 
                      (series_period_type='user_reg' AND 
                       now()::date between CASE WHEN series_activity_by_user_start IS NULL THEN now()::date ELSE user_group.reg_date::date + series_activity_by_user_start END
                          AND CASE WHEN series_activity_by_user_finish IS NULL THEN now()::date ELSE user_group.reg_date::date + series_activity_by_user_finish END)
                     )
                  ) as dt(c)
        )

        SELECT 'v_'||video_id AS video_id,
          video_uuid,
          video_filename,
          video_status,
          video_title,
          video_public,
          video_tag,
          CASE WHEN video_groups IS NULL THEN '{}' ELSE video_groups END as video_groups,
          CASE WHEN video_series IS NULL THEN '{}' ELSE video_series END as video_series,
          video_description,
          'https://'||company_corporate_code||'.${service_domain}'||'/'||video_output_file AS video_output_file,
          CASE WHEN company_commentbox_visible IS NULL THEN true ELSE company_commentbox_visible END as commentbox_visible,
          videos.created_at AT TIME ZONE $3 AS created_at, 
          videos.updated_at AT TIME ZONE $3 AS updated_at,           
          videos.deleted_at AT TIME ZONE $3 AS deleted_at 
        FROM videos, companies
        WHERE  video_company_id = company_id and video_uuid = $2 and company_id = $1 
          AND  videos.deleted_at IS NULL
          AND (video_public=true or (video_public=false and $4=true))
          AND ((video_groups && (select groups from user_group) OR 
          video_series && (select useries from user_series)) OR $4=true)
          `,
        [cid, uuid, timezone, is_admin, uid]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async getVideoThumbnail(payload) {
    const {acc, cid, uuid} = payload
    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT video_uuid ,
          video_thumbnail
        FROM videos
        WHERE  video_company_id = $1 and video_uuid = $2 `,
        [cid, uuid]
      )
      return rows[0]
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async videosBindedWithSeries(payload) {
    const {acc, cid, sid} = payload
    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        video_uuid as uuid,
        'v_'||video_id AS video_id, 
        video_company_id as cid,         
        video_title as name, 
        CASE WHEN video_series && ARRAY[$2::integer] THEN true ELSE false END as binded,
        deleted_at 
      FROM "videos"
      WHERE video_company_id=$1;`,
        [cid, sid]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async videosBindedWithGroup(payload) {
    const {acc, cid, gid} = payload
    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        video_uuid as uuid, 
        'v_'||video_id AS video_id,
        video_company_id as cid,         
        video_title as name, 
        CASE WHEN video_groups && ARRAY[$2::integer] THEN true ELSE false END as binded,
        deleted_at 
      FROM "videos"
      WHERE video_company_id=$1;`,
        [cid, gid]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async delVideo(payload) {
    let client = undefined
    const {acc, cid, uuid} = payload

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
      target_data: {cid, uuid}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const {rows} = await client.query(
        ` UPDATE videos 
          SET deleted_at = now()
          WHERE video_company_id=$1 and video_uuid=$2
          AND deleted_at IS NULL 
          RETURNING *`,
        [cid, uuid]
      )
      histData.object_name = `v_${rows[0].video_id}`
      histData.result = rows.length === 1
      histData.details = 'Success'
      return rows.length
    } catch (error) {
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async delVideoSeries(payload) {
    let client = undefined
    const {acc, video} = payload
    const {cid, uuid, sid} = video

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'deleted series',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure',
      target_data: {...video}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }
      client = await this.db.connect()

      const {rows: vids} = await client.query(
        `SELECT count(video_id) cnt 
          FROM videos 
          WHERE video_company_id=$2 AND video_uuid=$1 
          AND video_series && ARRAY[$3::integer];`,
        [uuid, cid, sid]
      )

      if (vids[0].cnt === '0') {
        throw Error(errors.THERE_IS_NOT_SERIES_IN_THE_VIDEO)
      }

      const {rows} = await client.query(
        `UPDATE videos 
          SET video_series = array_remove(video_series, $3) 
          WHERE video_company_id=$1 and video_uuid=$2
          RETURNING *`,
        [cid, uuid, sid]
      )

      histData.object_name = `v_${rows[0].video_id}`
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

  async addVideoSeries(payload) {
    let client = undefined
    const {acc, video} = payload
    const {cid, uuid, sid} = video

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'added video series',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure',
      target_data: {...video}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }
      client = await this.db.connect()

      const {rows: vids} = await client.query(
        `SELECT count(video_id) cnt 
          FROM videos 
          WHERE video_company_id=$2 AND video_uuid=$1 
          AND video_series && ARRAY[$3::integer];`,
        [uuid, cid, sid]
      )

      if (vids[0].cnt > 0) {
        throw Error(errors.THE_VIDEO_ALREADY_CONTAINS_THIS_SERIES)
      }

      const {rows} = await client.query(
        `UPDATE videos 
          SET video_series = array_append(video_series, $3) 
          WHERE video_company_id=$1 AND video_uuid=$2 AND deleted_at IS NULL
          RETURNING *`,
        [cid, uuid, sid]
      )

      histData.object_name =
        rows.length === 1 ? `v_${rows[0].video_id}` : 'v_nofing'
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

  async delVideoGroup(payload) {
    let client = undefined
    const {acc, video} = payload
    const {cid, uuid, gid} = video

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'deleted video group',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure',
      target_data: {...video}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }
      client = await this.db.connect()

      const {rows: vids} = await client.query(
        `SELECT count(video_id) cnt 
          FROM videos 
          WHERE video_company_id=$2 AND video_uuid=$1 
          AND video_groups && ARRAY[$3::integer];`,
        [uuid, cid, gid]
      )

      if (vids[0].cnt === '0') {
        throw Error(errors.THERE_IS_NOT_GROUP_IN_THE_VIDEO)
      }

      const {rows} = await client.query(
        `UPDATE videos 
          SET video_groups = array_remove(video_groups, $3) 
          WHERE video_company_id=$1 and video_uuid=$2
          RETURNING *`,
        [cid, uuid, gid]
      )

      histData.object_name = `v_${rows[0].video_id}`
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

  async addVideoGroup(payload) {
    let client = undefined
    const {acc, video} = payload
    const {cid, uuid, gid} = video

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'added video group',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure',
      target_data: {...video}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }
      client = await this.db.connect()

      const {rows: vids} = await client.query(
        `SELECT count(video_id) cnt 
          FROM videos 
          WHERE video_company_id=$2 AND video_uuid=$1 
          AND video_groups && ARRAY[$3::integer];`,
        [uuid, cid, gid]
      )

      if (vids[0].cnt > 0) {
        throw Error(errors.THE_VIDEO_ALREADY_CONTAINS_THIS_GROUP)
      }

      const {rows} = await client.query(
        `UPDATE videos 
          SET video_groups = array_append(video_groups, $3) 
          WHERE video_company_id=$1 AND video_uuid=$2 AND deleted_at IS NULL
          RETURNING *`,
        [cid, uuid, gid]
      )

      histData.object_name =
        rows.length === 1 ? `v_${rows[0].video_id}` : 'v_nofing'
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

  async updVideo(payload) {
    let client = undefined
    const {acc, data} = payload
    const {cid, uuid, ...fields} = data

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'edited',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure',
      target_data: {...data}
    }

    try {
      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const fields_length = Object.keys(fields).length
      let select = 'SELECT'
      Object.keys(fields).forEach((element, idx) => {
        switch (element) {
          // case 'video_thumbnail':
          //   select += ' decode($' + (idx + 1) + ", 'hex')"
          //   break
          case 'video_public':
            select += ` $${idx + 1}::boolean`
            break
          case 'video_groups':
            select += ` $${idx + 1}::integer[]`
            break
          case 'video_series':
            select += ` $${idx + 1}::integer[]`
            break
          default:
            select += ` $${idx + 1}`
            break
        }
        select += idx + 1 < fields_length ? ', ' : ''
      })
      const query = {
        text: `UPDATE videos SET (${Object.keys(fields)}) = (${select}) 
         WHERE deleted_at IS NULL AND video_company_id=$${fields_length +
           1} AND video_uuid=$${fields_length + 2} 
           RETURNING *`,
        values: [...Object.values(fields), cid, uuid]
      }
      const {rows} = await client.query(query)
      histData.object_name = `v_${rows[0].video_id}`
      histData.result = rows.length === 1
      histData.details = `Updated information of [${rows[0].video_title}].`
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

  async updVideoStatus(payload) {
    let client = undefined
    const {acc, data} = payload
    const {cid, uuid, value} = data

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'state',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure',
      target_data: {...data}
    }

    const avValues = ['uploaded']

    try {
      if (!avValues.includes(value.toLowerCase())) {
        throw Error(errors.WRONG_STATUS_VALUE)
      }

      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const query = {
        text: `UPDATE videos SET video_status = $3
         WHERE video_company_id=$1 AND video_uuid=$2 
          AND deleted_at IS NULL
         RETURNING *`,
        values: [cid, uuid, value.toLowerCase()]
      }

      const {rows} = await client.query(query)
      histData.object_name = `v_${rows[0].video_id}`
      histData.result = rows.length === 1
      histData.details = `Success [${value.toLowerCase()}]`
      return rows
    } catch (error) {
      throw Error(error)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async updVideoPublicStatus(payload) {
    let client = undefined
    const {acc, data} = payload
    const {cid, uuid, value} = data

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: 'status',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failed',
      target_data: {...data}
    }

    const avValues = ['public', 'private']

    try {
      if (!avValues.includes(value.toLowerCase())) {
        throw Error(errors.WRONG_PRIVATE_VALUE)
      }

      if (acc.company_id !== cid || !acc.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const query = {
        text: `UPDATE videos SET video_public = $3
         WHERE video_company_id=$1 
          AND video_uuid=$2 AND deleted_at IS NULL 
          RETURNING video_id`,
        values: [cid, uuid, value.toLowerCase() === 'public']
      }
      const {rows} = await client.query(query)
      histData.object_name = `v_${rows[0].video_id}`
      histData.result = rows.length === 1
      histData.details = value
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

  async updVideoOutputFile(payload) {
    const {cid, uuid, path_to_manifest, path_to_thumbnail} = payload
    const client = await this.db.connect()

    try {
      const getGcsOutput = {
        text: `SELECT storage_bucket_output
        FROM storages, companies
        WHERE company_storage_id = storage_id and company_id=$1 `,
        values: [cid]
      }
      const qResult = await client.query(getGcsOutput)
      const {storage_bucket_output} = qResult.rows[0]
      const bucket = this.gcs.bucket(storage_bucket_output)
      const thumbnail = await bucket.file(`/${path_to_thumbnail}`).download()
      const base64data = Buffer.from(thumbnail[0]).toString('base64')

      const query = {
        text: `UPDATE videos 
          SET video_status = 'ready', video_output_file = $3, 
          video_thumbnail = $4
          WHERE video_company_id=$1 AND video_uuid=$2`,
        values: [
          cid,
          uuid,
          path_to_manifest,
          `data:image/png;base64,${base64data}`
        ]
      }
      const {rowCount} = await client.query(query)
      return rowCount
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }

  async addPlayerEvent(payload) {
    let client = undefined
    const {acc, data} = payload
    const {
      cid,
      uuid,
      event_action,
      event_data,
      event_result,
      event_details
    } = data

    const {user_id, company_id, uid} = acc
    let histData = {
      category: this.history_category,
      action: event_action,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failed',
      target_data: {...event_data}
    }

    try {
      client = await this.db.connect()
      const query = {
        text: `SELECT video_id from videos 
         WHERE video_company_id=$1 
          AND video_uuid=$2;`,
        values: [cid, uuid]
      }
      const {rows} = await client.query(query)
      histData.object_name = `v_${rows[0].video_id}`
      histData.result = rows.length === 1
      histData.details = event_details
      histData.result = event_result === 's' ? true : false
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

module.exports = VideoService
