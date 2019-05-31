'use strict'
const errors = require('../errors')
const db_api = require('../db_api')

class VideoService {
  constructor(db, gcs) {
    this.db = db
    this.gcs = gcs
  }

  /**
   * Get private url of a private file in GCS.
   * By default, the private link is for read action and it will expire in 1 day.
   *
   * @param {string} bucketName
   * @param {Object} [config]
   * @return {Promise.}
   */

  async videosGcsUploadSignedUrl(payload) {
    const bucket = this.gcs.bucket('p-stream-test')
    const file = bucket.file('something.jpg')

    const config = {
      action: 'write',
      expires: Date.now() + 1000 * 60 * 60
    }

    const [url] = await file.getSignedUrl(config)
    //const [url]= await file.getSignedPolicy(config)
    console.log('file=', url)

    return {url: url}
  }
}

module.exports = VideoService
