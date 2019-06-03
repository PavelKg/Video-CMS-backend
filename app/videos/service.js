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
    const {files} = query

    files.forEach((element, i) => {
      try {
        files[i] = JSON.parse(element)
      } catch (err) {
        console.log('parse=', err)
      }
    })

    if (!this.gcs) {
      throw Error(errors.WRONG_CONNECT_TO_GCS)
    }

    const client = await this.db.connect()
    const {rows} = await client.query(
      `SELECT storage_bucket, storage_content_limit 
        FROM storages
        WHERE storage_cid=$1 and upper(storage_type)=upper($2)`,
      [cid, storage_type]
    )

    client.release()
    const {storage_bucket, storage_content_limit} = rows[0]

    const options = {
      action: 'write1',
      expires: Date.now() + 1000 * 60 * 60, // One hour
      contentType: ''
    }

    const bucket = this.gcs.bucket(storage_bucket)

    const result = await Promise.all(
      files.map(async file => {
        const c_options = {...options, contentType: file.type}
        const gcs_file = bucket.file(file.name)
        return (await gcs_file.getSignedUrl(c_options))[0]
      })
    )
    return result
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
