'use strict'
const errors = require('../../errors')
const db_api = require('../../db_api')

const service_domain = 'p-stream.jp'

class FileService {
  constructor(db, gcs, histLogger) {
    this.db = db
    this.gcs = gcs
    this.history_category = 'Files'
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

  async filesGcsUploadSignedUrl(payload) {
    const {autz, query} = payload
    const storage_type = 'gcs'
    const {name, size, type, uuid} = query
    const title = name.match(/^(.+).[\w]{3,4}$/iu)[1]

    const {user_id, company_id: cid, uid} = autz
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

      storage_bucket_input = `${rows[0].storage_bucket_output}/files`
      storage_bucket_output = storage_bucket_input
      const storage_content_limit = rows[0].storage_content_limit

      const {rows: insRows} = await client.query(
        `INSERT INTO files (file_filename, file_type, file_filesize,
        file_uuid, file_status, file_bucket_input, 
        file_bucket_output,file_company_id, file_public, file_title)
       values ($1, $2, $3, $4, 'create', $5, $6, $7, false, $8)
       RETURNING file_id;`,
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
      histData.object_name = `F${insRows[0].file_id}`
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

  // async filesGcsUploadSignedPolicy(payload) {
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

  async filesCatalog(payload) {
    const {autz, query} = payload
    const {company_id: cid, uid, timezone, is_admin} = autz

    const {
      limit = 'ALL',
      offset = 0,
      sort = '-files.updated_at',
      filter = undefined
    } = query

    const onlyPublic = !Boolean(is_admin)
      ? ` AND file_public = true AND file_status='ready' AND files.deleted_at IS NULL`
      : ''

    const qSort = db_api.sorting(sort, 'files')
    let qFilter = Boolean(filter) ? db_api.filtration(filter, 'files') : ''
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
          'F'||file_id AS file_id,
          file_uuid,
          file_status,
          file_public,
          file_title,
          created_at AT TIME ZONE $3 AS created_at, 
          updated_at AT TIME ZONE $3 AS updated_at,           
          deleted_at AT TIME ZONE $3 AS deleted_at,
          file_type
        FROM files
        WHERE  file_company_id = $1 
        AND ((file_groups && (select groups from user_group) OR 
              file_series && (select useries from user_series)) 
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

  async getFile(payload) {
    // get files data for uuid
    const {autz, cid, uuid} = payload
    const {timezone, is_admin, uid} = autz
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

        SELECT 'F'||file_id AS file_id,
          file_uuid,
          file_filename,
          file_status,
          file_title,
          file_public,
          file_tag,
          CASE WHEN file_groups IS NULL THEN '{}' ELSE file_groups END as file_groups,
          CASE WHEN file_series IS NULL THEN '{}' ELSE file_series END as file_series,
          file_description,
          'https://'||company_corporate_code||'.${service_domain}'||'/'||file_output_file AS file_output_file,
          CASE WHEN company_commentbox_visible IS NULL THEN true ELSE company_commentbox_visible END as commentbox_visible,
          files.created_at AT TIME ZONE $3 AS created_at, 
          files.updated_at AT TIME ZONE $3 AS updated_at,           
          files.deleted_at AT TIME ZONE $3 AS deleted_at, 
          file_type
        FROM files, companies
        WHERE  file_company_id = company_id and file_uuid = $2 and company_id = $1 
          AND  files.deleted_at IS NULL
          AND (file_public=true or (file_public=false and $4=true))
          AND ((file_groups && (select groups from user_group) OR 
          file_series && (select useries from user_series)) OR $4=true)
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

  async getFileThumbnail(payload) {
    const {autz, cid, uuid} = payload
    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT file_uuid ,
          file_thumbnail
        FROM files
        WHERE  file_company_id = $1 and file_uuid = $2 `,
        [cid, uuid]
      )
      return rows[0]
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async filesBindedWithSeries(payload) {
    const {autz, cid, sid} = payload
    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        file_uuid as uuid,
        'F'||file_id AS file_id, 
        file_company_id as cid,         
        file_title as name, 
        CASE WHEN file_series && ARRAY[$2::integer] THEN true ELSE false END as binded,
        deleted_at 
      FROM "files"
      WHERE file_company_id=$1;`,
        [cid, sid]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async filesBindedWithGroup(payload) {
    const {autz, cid, gid} = payload
    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        file_uuid as uuid, 
        'F'||file_id AS file_id,
        file_company_id as cid,         
        file_title as name, 
        CASE WHEN file_groups && ARRAY[$2::integer] THEN true ELSE false END as binded,
        deleted_at 
      FROM "files"
      WHERE file_company_id=$1;`,
        [cid, gid]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async delFile(payload) {
    let client = undefined
    const {autz, cid, uuid} = payload

    const {user_id, company_id, uid} = autz
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
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const {rows} = await client.query(
        ` UPDATE files 
          SET deleted_at = now()
          WHERE file_company_id=$1 and file_uuid=$2
          AND deleted_at IS NULL 
          RETURNING *`,
        [cid, uuid]
      )
      histData.object_name = `F${rows[0].file_id}`
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

  async delFileSeries(payload) {
    let client = undefined
    const {autz, file} = payload
    const {cid, uuid, sid} = file

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'deleted series',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure',
      target_data: {...file}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }
      client = await this.db.connect()

      const {rows: vids} = await client.query(
        `SELECT count(file_id) cnt 
          FROM files 
          WHERE file_company_id=$2 AND file_uuid=$1 
          AND file_series && ARRAY[$3::integer];`,
        [uuid, cid, sid]
      )

      if (vids[0].cnt === '0') {
        throw Error(errors.THERE_IS_NOT_SERIES_IN_THE_VIDEO)
      }

      const {rows} = await client.query(
        `UPDATE files 
          SET file_series = array_remove(file_series, $3) 
          WHERE file_company_id=$1 and file_uuid=$2
          RETURNING *`,
        [cid, uuid, sid]
      )

      histData.object_name = `F${rows[0].file_id}`
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

  async addFileSeries(payload) {
    let client = undefined
    const {autz, file} = payload
    const {cid, uuid, sid} = file

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'added file series',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure',
      target_data: {...file}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }
      client = await this.db.connect()

      const {rows: vids} = await client.query(
        `SELECT count(file_id) cnt 
          FROM files 
          WHERE file_company_id=$2 AND file_uuid=$1 
          AND file_series && ARRAY[$3::integer];`,
        [uuid, cid, sid]
      )

      if (vids[0].cnt > 0) {
        throw Error(errors.THE_VIDEO_ALREADY_CONTAINS_THIS_SERIES)
      }

      const {rows} = await client.query(
        `UPDATE files 
          SET file_series = array_append(file_series, $3) 
          WHERE file_company_id=$1 AND file_uuid=$2 AND deleted_at IS NULL
          RETURNING *`,
        [cid, uuid, sid]
      )

      histData.object_name =
        rows.length === 1 ? `F${rows[0].file_id}` : 'F_nofing'
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

  async delFileGroup(payload) {
    let client = undefined
    const {autz, file} = payload
    const {cid, uuid, gid} = file

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'deleted file group',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure',
      target_data: {...file}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }
      client = await this.db.connect()

      const {rows: vids} = await client.query(
        `SELECT count(file_id) cnt 
          FROM files 
          WHERE file_company_id=$2 AND file_uuid=$1 
          AND file_groups && ARRAY[$3::integer];`,
        [uuid, cid, gid]
      )

      if (vids[0].cnt === '0') {
        throw Error(errors.THERE_IS_NOT_GROUP_IN_THE_VIDEO)
      }

      const {rows} = await client.query(
        `UPDATE files 
          SET file_groups = array_remove(file_groups, $3) 
          WHERE file_company_id=$1 and file_uuid=$2
          RETURNING *`,
        [cid, uuid, gid]
      )

      histData.object_name = `F${rows[0].file_id}`
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

  async addFileGroup(payload) {
    let client = undefined
    const {autz, file} = payload
    const {cid, uuid, gid} = file

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'added file group',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure',
      target_data: {...file}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }
      client = await this.db.connect()

      const {rows: vids} = await client.query(
        `SELECT count(file_id) cnt 
          FROM files 
          WHERE file_company_id=$2 AND file_uuid=$1 
          AND file_groups && ARRAY[$3::integer];`,
        [uuid, cid, gid]
      )

      if (vids[0].cnt > 0) {
        throw Error(errors.THE_VIDEO_ALREADY_CONTAINS_THIS_GROUP)
      }

      const {rows} = await client.query(
        `UPDATE files 
          SET file_groups = array_append(file_groups, $3) 
          WHERE file_company_id=$1 AND file_uuid=$2 AND deleted_at IS NULL
          RETURNING *`,
        [cid, uuid, gid]
      )

      histData.object_name =
        rows.length === 1 ? `F${rows[0].file_id}` : 'F_nofing'
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

  async updFile(payload) {
    let client = undefined
    const {autz, data} = payload
    const {cid, uuid, ...fields} = data

    const {user_id, company_id, uid} = autz
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
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const fields_length = Object.keys(fields).length
      let select = 'SELECT'
      Object.keys(fields).forEach((element, idx) => {
        switch (element) {
          // case 'file_thumbnail':
          //   select += ' decode($' + (idx + 1) + ", 'hex')"
          //   break
          case 'file_public':
            select += ` $${idx + 1}::boolean`
            break
          case 'file_groups':
            select += ` $${idx + 1}::integer[]`
            break
          case 'file_series':
            select += ` $${idx + 1}::integer[]`
            break
          default:
            select += ` $${idx + 1}`
            break
        }
        select += idx + 1 < fields_length ? ', ' : ''
      })
      const query = {
        text: `UPDATE files SET (${Object.keys(fields)}) = (${select}) 
         WHERE deleted_at IS NULL AND file_company_id=$${
           fields_length + 1
         } AND file_uuid=$${fields_length + 2} 
           RETURNING *`,
        values: [...Object.values(fields), cid, uuid]
      }
      const {rows} = await client.query(query)
      histData.object_name = `F${rows[0].file_id}`
      histData.result = rows.length === 1
      histData.details = `Updated information of [${rows[0].file_title}].`
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

  async updFileStatus(payload) {
    let client = undefined
    const {autz, data} = payload
    const {cid, uuid, value} = data

    const {user_id, company_id, uid} = autz
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

      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const query = {
        text: `UPDATE files SET file_status = $3
         WHERE file_company_id=$1 AND file_uuid=$2 
          AND deleted_at IS NULL
         RETURNING *`,
        values: [cid, uuid, value.toLowerCase()]
      }

      const {rows} = await client.query(query)
      histData.object_name = `F${rows[0].file_id}`
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

  async updFilePublicStatus(payload) {
    let client = undefined
    const {autz, data} = payload
    const {cid, uuid, value} = data

    const {user_id, company_id, uid} = autz
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

      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const query = {
        text: `UPDATE files SET file_public = $3
         WHERE file_company_id=$1 
          AND file_uuid=$2 AND deleted_at IS NULL 
          RETURNING file_id`,
        values: [cid, uuid, value.toLowerCase() === 'public']
      }
      const {rows} = await client.query(query)
      histData.object_name = `F${rows[0].file_id}`
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

  async updFileOutputFile(payload) {
    const {cid, uuid, path_to_manifest, path_to_thumbnail} = payload
    const client = await this.db.connect()

    try {
      // const getGcsOutput = {
      //   text: `SELECT storage_bucket_output
      //   FROM storages, companies
      //   WHERE company_storage_id = storage_id and company_id=$1 `,
      //   values: [cid]
      // }
      //const qResult = await client.query(getGcsOutput)
      //const {storage_bucket_output} = qResult.rows[0]
      //const bucket = this.gcs.bucket(storage_bucket_output)
      //const thumbnail = await bucket.file(`/${path_to_thumbnail}`).download()
      //const base64data = Buffer.from(thumbnail[0]).toString('base64')

      const query = {
        text: `UPDATE files 
          SET file_status = 'ready', file_output_file = $3
          WHERE file_company_id=$1 AND file_uuid=$2`,
        values: [
          cid,
          uuid,
          path_to_manifest
          //`data:image/png;base64,${base64data}`
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
    const {autz, data} = payload
    const {
      cid,
      uuid,
      event_action,
      event_data,
      event_result,
      event_details
    } = data

    const {user_id, company_id, uid} = autz
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
        text: `SELECT file_id from files 
         WHERE file_company_id=$1 
          AND file_uuid=$2;`,
        values: [cid, uuid]
      }
      const {rows} = await client.query(query)
      histData.object_name = `F${rows[0].file_id}`
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

module.exports = FileService
