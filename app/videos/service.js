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
    if (!this.gcs) {
      throw Error(errors.WRONG_CONNECT_TO_GCS)
    }

    const options = {
      action: 'write',
      expires: Date.now() + 1000 * 60 * 60,  // One hour
      contentType: 'image/jpeg'
    }

    const bucket = this.gcs.bucket('p-stream-test')
    const file = bucket.file('something.jpg')

    const [url] = await file.getSignedUrl(options)
    console.log('file=', url)

    return {url: url}
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
    };

    const bucket = this.gcs.bucket('p-stream-test')
    const file = bucket.file('something.jpg')
    const [url]= await file.getSignedPolicy(options)
    console.log('file=', url)

    return {url: url}
  }
}

module.exports = VideoService
