'use strict'

const crypto = require('crypto')
const DUPLICATE_KEY_ERROR_CODE = 11000

const errors = require('../errors')

class PersonService {
  constructor(db) {
    this.db = db
  }

  // async register(username, password) {
  //   let writeResult
  //   try {
  //     writeResult = await this.userCollection.insertOne({username, password})
  //   } catch (e) {
  //     if (e.code === DUPLICATE_KEY_ERROR_CODE) {
  //       throw new Error(errors.USERNAME_IS_NOT_AVAILABLE)
  //     }
  //     throw e
  //   }
  //     return writeResult.insertedId
  // }

  async login(username, password) {
    const client = await this.db.connect()
    const {rows} = await client.query(
      `select login($1, $2) as user;`,
      [username, password]
    )
    client.release()
    const user = rows[0].user

    if (!user) throw new Error(errors.WRONG_CREDENTIAL)
    return user
  }

  async getProfile(myUid, uid) {
    const client = await this.db.connect()
    const {rows} = await client.query(
      `select user_profile($1::jsonb, $2) as uProfile;`,
      [JSON.stringify({userId: myUid}), uid]
    )
    client.release()

    const user_profile = rows[0].uprofile
    if (!user_profile) throw new Error(errors.WRONG_USER_ID)
    return user_profile
  }
}

module.exports = PersonService
