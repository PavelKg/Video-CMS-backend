'use strict'
const errors = require('../../errors')
const db_api = require('../../db_api')

class VideoService {
  constructor(db, gcs) {
    this.db = db
    this.gcs = gcs
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
    const {company_id: cid} = acc
    const storage_type = 'gcs'
    const {name, size, type, uuid} = query

    if (!this.gcs) {
      throw Error(errors.WRONG_CONNECT_TO_GCS)
    }

    const client = await this.db.connect()
    let storage_bucket_input = ''
    let storage_bucket_output = ''
    try {
      const {rows} = await client.query(
        `SELECT storage_bucket_input, storage_bucket_output, storage_content_limit 
        FROM storages
        WHERE storage_cid=$1 and upper(storage_type)=upper($2)`,
        [cid, storage_type]
      )

      storage_bucket_input = rows[0].storage_bucket_input
      storage_bucket_output = rows[0].storage_bucket_output
      const storage_content_limit = rows[0].storage_content_limit

      const {rowCount} = await client.query(
        `INSERT INTO videos (video_filename, video_type, video_filesize,
        video_uuid, video_status, video_bucket_input, 
        video_bucket_output,video_company_id)
       values ($1, $2, $3, $4, 'create', $5, $6, $7)`,
        [
          name,
          type,
          size,
          uuid,
          storage_bucket_input,
          storage_bucket_output,
          cid
        ]
      )
    } catch (error) {
    } finally {
      client.release()
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
    console.log('acc=', acc)
    const cid = acc.company_id
    const uid = acc.uid
    const {
      limit = 'ALL',
      offset = 0,
      sort = '-videos.created_at',
      filter = undefined
    } = payload.query

    const onlyPublic = !Boolean(acc.is_admin) ? ' AND video_public = true AND videos.deleted_at IS NULL' : ''

    const qSort = db_api.sorting(sort, 'videos')
    const qFilter = Boolean(filter) ? db_api.filtration(filter, 'videos') : ''

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT video_uuid,
        video_status,
        created_at,
        deleted_at
        FROM videos
        WHERE  video_company_id = $1 ${onlyPublic}
        ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
        [cid, offset]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async getVideo(payload) {
    const {acc, cid, uuid} = payload
    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT video_uuid ,
          video_filename,
          video_status,
          video_title,
          video_public,
          video_tag,
          video_description,
          video_output_file,
          created_at,
          updated_at,
          deleted_at
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

  async delVideo(payload) {
    const {acc, cid, uuid} = payload

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rowCount} = await client.query(
        ` UPDATE videos 
          SET deleted_at = now()::timestamp without time zone 
          WHERE video_company_id=$1 and video_uuid=$2
          and deleted_at is null`,
        [cid, uuid]
      )
      return rowCount
    } catch (error) {
    } finally {
      client.release()
    }
  }

  async updVideo(payload) {
    const {acc, data} = payload
    const {cid, uuid, ...fields} = data

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
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
          default:
            select += ` $${idx + 1}`
            break
        }
        select += idx + 1 < fields_length ? ', ' : ''
      })
      const query = {
        text: `UPDATE videos SET (${Object.keys(fields)}) = (${select}) 
         WHERE video_company_id=$${fields_length +
           1} AND video_uuid=$${fields_length + 2}`,
        values: [...Object.values(fields), cid, uuid]
      }
      const {rowCount} = await client.query(query)
      return rowCount
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }

  async updVideoStatus(payload) {
    const {acc, data} = payload
    const {cid, uuid, value} = data

    const avValues = ['uploaded']

    if (!avValues.includes(value.toLowerCase())) {
      throw Error(errors.WRONG_STATUS_VALUE)
    }

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const query = {
        text: `UPDATE videos SET video_status = $3
         WHERE video_company_id=$1 AND video_uuid=$2
         RETURNING *`,
        values: [cid, uuid, value.toLowerCase()]
      }
      const {rows} = await client.query(query)

      return rows
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }

  async updVideoPublicStatus(payload) {
    const {acc, data} = payload
    const {cid, uuid, value} = data

    const avValues = ['public', 'private']

    if (!avValues.includes(value.toLowerCase())) {
      throw Error(errors.WRONG_PRIVATE_VALUE)
    }

    if (acc.company_id !== cid || !acc.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const query = {
        text: `UPDATE videos SET video_public = $3
         WHERE video_company_id=$1 AND video_uuid=$2`,
        values: [cid, uuid, value.toLowerCase()==='public']
      }
      const {rowCount} = await client.query(query)
      return rowCount
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }
  
  async updVideoOutputFile(payload){
    const {cid, uuid, path_to_file} = payload
    const client = await this.db.connect()
    try {
      const query = {
        text: `UPDATE videos 
          SET video_status = 'ready', video_output_file = $3
          WHERE video_company_id=$1 AND video_uuid=$2`,
        values: [cid, uuid, path_to_file]
      }
      const {rowCount} = await client.query(query)
      return rowCount
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }
}

module.exports = VideoService
