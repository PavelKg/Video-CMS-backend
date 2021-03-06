'use strict'

class AuthorizationService {
  constructor(db) {
    this.db = db
  }

  async getPermissions(person) {
    let client
    const {uid, company_id: cid} = person.user
    try {
      client = await this.db.connect()
      const {rows} = await client.query(
        `SELECT user_id, user_uid uid, user_company_id AS company_id, 
        roles.role_is_admin AS is_admin, company_timezone AS timezone,  
        roles.role_permissions AS permits
        FROM roles, users, companies 
        WHERE users.user_role_id=roles.role_id 
          AND users.user_company_id=companies.company_id 
          AND roles.role_company_id=companies.company_id 
          AND users.user_uid=$1 
          AND companies.company_id=$2;`,
        [uid, cid]
      )
      return rows.length > 0 ? rows[0] : {}
    } catch (error) {
      throw error
    } finally {
      client.release()
    }
  }

  recCheckObject(fnList, permList) {
    const fnListLeft = fnList.slice(0)
    const nextFn = fnListLeft.shift()

    if (fnListLeft.length === 0) {
      return permList.some((perm) => perm.name === nextFn)
    }

    const nextPermInd = permList.findIndex((perm) => perm.name === nextFn)

    if (
      nextPermInd === -1 ||
      !permList[nextPermInd].children ||
      permList[nextPermInd].children.length === 0
    ) {
      return false
    } else {
      return this.recCheckObject(fnListLeft, permList[nextPermInd].children)
    }
  }

  checkAccess(reqAcc, permits) {
    const fnList = reqAcc.split('.')
    return this.recCheckObject(fnList, permits['items'])
  }
}

module.exports = AuthorizationService
