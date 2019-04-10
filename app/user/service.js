'use strict'

const crypto = require('crypto')
const DUPLICATE_KEY_ERROR_CODE = 11000

const errors = require('../errors')

class UserService {
  constructor(db) {
    this.db = db
  }

  async register(username, password) {
    let writeResult
    try {
      writeResult = await this.userCollection.insertOne({username, password})
    } catch (e) {
      if (e.code === DUPLICATE_KEY_ERROR_CODE) {
        throw new Error(errors.USERNAME_IS_NOT_AVAILABLE)
      }
      throw e
    }

    return writeResult.insertedId
  }

  async login(username, password) {
    const client = await this.db.connect()
    const hash = await crypto
      .createHash('sha256')
      .update(password)
      .digest('hex')
    const {rows} = await client.query(
      `select login($1, decode($2::text, 'hex')) as user;`,
      [username, hash]
    )
    client.release()
    const user = rows[0].user

    if (!user) throw new Error(errors.WRONG_CREDENTIAL)
    return user
  }

  getProfile(_id) {
    return this.userCollection.findOne({_id}, {projection: {password: 0}})
  }

  async search(searchString) {
    const query = {
      username: {$regex: searchString}
    }
    const users = await this.userCollection
      .find(query, {projection: {password: 0}})
      .limit(5)
      .toArray()
    return users
  }
}

module.exports = UserService
