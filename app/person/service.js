'use strict'
const crypto = require('crypto')
//const DUPLICATE_KEY_ERROR_CODE = 11000
const errors = require('../errors')
const mail_templ = require('./mail_templates')

const {SYSTEM_NAME, MAIL_USER, RECOVERY_PASSWORD_URL} = process.env

class PersonService {
  constructor(db, nodemailer) {
    this.db = db
    this.nodemailer = nodemailer
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
    let factQuery = ''
    try {
      const {rows} = await client.query(
        //`select login($1, $2);`,
        `SELECT 
        user_id,
        user_uid AS uid, 
        role_name AS role, 
        company_id, 
        role_is_admin AS is_admin,
        company_timezone AS timezone 
      FROM users, roles, companies 
      WHERE users.user_company_id=companies.company_id 
	      and roles.role_company_id=companies.company_id 
	      and roles.role_id=users.user_role_id
	      and users.deleted_at IS NULL
	      and users.user_uid =$1 and users.user_password=crypt($2, user_password);`,
        [username, password]
      )

      const user = rows[0]
      factQuery = {
        text: `INSERT INTO public."userHistoryLog" 
      (userhist_user_id, userhist_action, userhist_date, userhist_result, userhist_data) 
      values 
      ($1, 'login', now(), $2, $3);`,
        values: [
          user ? user.user_id : null,
          user ? 'success' : 'failed',
          {uid: username}
        ]
      }

      if (!user) {
        throw new Error(errors.WRONG_CREDENTIAL)
      }

      return user
    } catch (error) {
      throw Error(error)
    } finally {
      await client.query(factQuery)
      client.release()
    }
  }

  async getProfile(acc) {
    const client = await this.db.connect()
    const {company_id: cid, uid} = acc
    try {
      const {rows} = await client.query(
        //`select user_profile($1::jsonb, $2) as uProfile;`,
        `SELECT
          user_uid As uid, 
          role_name AS role, 
          user_fullname AS username, 
          company_id, 
          company_name, 
          user_email AS email,
          CASE WHEN company_is_super THEN 'super'
                WHEN role_is_admin THEN 'admin'
            ELSE 'user'
          END AS irole 
        FROM users, roles, companies 
        WHERE users.user_company_id=companies.company_id 
          AND roles.role_company_id=companies.company_id 
          AND roles.role_id=users.user_role_id
          AND users.user_uid = $2
          AND companies.company_id = $1;`,
        [cid, uid]
      )
      const user_profile = rows[0]
      if (!user_profile) throw new Error(errors.WRONG_USER_ID)
      return user_profile
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }

  async findUserByEmail(email) {
    if (!email) {
      throw Error(errors.WRONG_EMAIL_TYPE)
    }
    const client = await this.db.connect()
    try {
      const {rows} = await client.query(`select loginEmail($1);`, [email])
      const user = rows[0].loginemail

      if (!user) throw new Error(errors.WRONG_CREDENTIAL)
      return user
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }
  async sendEmail(payload) {
    const {email, fullname, token, valid_date, locale} = payload
    const url = `${RECOVERY_PASSWORD_URL}?token=${token}`
    const valid = new Date(valid_date)
      .toISOString()
      .slice(0, 19)
      .replace(/\-/gi, '/')
      .replace(/T/gi, ' ')
    try {
      const time_zone = `UTC${-(new Date().getTimezoneOffset() / 60)} (${
        Intl.DateTimeFormat().resolvedOptions().timeZone
      })`
      const letter = mail_templ(locale, {
        system_name: SYSTEM_NAME,
        name: fullname,
        email: email,
        valid: `${valid} ${time_zone}`,
        url
      })
      await this.nodemailer.sendMail({
        from: MAIL_USER,
        to: email,
        subject: letter.subject,
        text: letter.body
      })
      return true
    } catch (error) {
      throw Error(error)
    }
  }
  async getPasswordResetToken(person, email) {
    const {uid, company_id} = person
    const client = await this.db.connect()
    try {
      const {rows: user} = await client.query(
        `SELECT user_id FROM users 
          WHERE user_uid=$1 
          AND user_company_id=$2;`,
        [uid, company_id]
      )
      const user_id = user[0].user_id
      const token = crypto.randomBytes(24).toString('hex')
      const lifetime_min = 60

      const {rows: inserted} = await client.query(
        `INSERT INTO password_recovery
        (pr_user_id, pr_user_uid, pr_user_mail, pr_token, pr_company_id, pr_lifetime_min) 
        VALUES 
        ($1, $2, $3, $4, $5, $6)
        RETURNING *;`,
        [user_id, uid, email, token, company_id, lifetime_min]
      )

      const valid_date = new Date(inserted[0].created_at)
      valid_date.setTime(valid_date.getTime() + lifetime_min * 60 * 1000)

      return {token, valid_date}
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }
  async updateUserPasword(token, password) {
    const client = await this.db.connect()
    try {
      const {rows: pr} = await client.query(
        `SELECT pr_user_id 
         FROM password_recovery
         WHERE pr_token = $1 
          AND (created_at + interval '1 minutes' * pr_lifetime_min) > now();`,
        [token]
      )

      if (pr.length === 0) {
        return 0
      }
      const user_id = pr[0].pr_user_id

      if (!user_id) throw new Error(errors.RECOVERY_TOKEN_IS_NOT_VALID)

      const {rowCount} = await client.query(
        `UPDATE users 
         SET user_password = crypt($2, gen_salt('bf'))
         WHERE user_id = $1;`,
        [user_id, password]
      )
      return rowCount
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }
}

module.exports = PersonService
