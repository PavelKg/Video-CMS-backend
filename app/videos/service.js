'use strict'
const errors = require('../errors')
const db_api = require('../db_api')

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

    // files.forEach((element, i) => {
    //   try {
    //     files[i] = JSON.parse(element)
    //   } catch (err) {
    //     console.log('parse=', err)
    //   }
    // })

    if (!this.gcs) {
      throw Error(errors.WRONG_CONNECT_TO_GCS)
    }

    const client = await this.db.connect()
    let storage_bucket
    try {
      const {rows} = await client.query(
        `SELECT storage_bucket, storage_content_limit 
        FROM storages
        WHERE storage_cid=$1 and upper(storage_type)=upper($2)`,
        [cid, storage_type]
      )

      storage_bucket = rows[0].storage_bucket
      const storage_content_limit = rows[0].storage_content_limit
      console.log('rows=', rows)

      const {rowCount} = await client.query(
        `INSERT INTO videos (video_filename, video_type, video_filesize,
        video_uuid, video_status, vudeo_bucket, video_company_id)
       values ($1, $2, $3, $4, 'create', $5, $6)`,
        [name, type, size, uuid, storage_bucket, cid]
      )

      console.log('videos insert rowCount=', rowCount)
    } catch (error) {
    } finally {
      client.release()
    }

    const options = {
      action: 'write',
      expires: Date.now() + 1000 * 60 * 60, // One hour
      contentType: type
    }

    const bucket = this.gcs.bucket(storage_bucket)
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

  async videosGcsUploadSignedPolicy(payload) {
    if (!this.gcs) {
      throw Error(errors.WRONG_CONNECT_TO_GCS)
    }

    var options = {
      equals: ['$Content-Type', 'image/jpeg'],
      action: 'write',
      expires: Date.now() + 1000 * 60 * 60, // one hour
      contentLengthRange: {
        min: 0,
        max: 1024
      }
    }

    const bucket = this.gcs.bucket('p-stream-test')
    const file = bucket.file('something.jpg')
    const [url] = await file.getSignedPolicy(options)
    console.log('file=', url)

    return {url: url}
  }
}

module.exports = VideoService
