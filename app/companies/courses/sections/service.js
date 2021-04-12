'use strict'
const errors = require('../../../errors')
const db_api = require('../../../db_api')

class CoursesSectionsService {
  constructor(db, histLogger) {
    this.db = db
    this.history_category = 'Courses'
    this.histLogger = histLogger
  }

  async coursesSections(payload) {
    const {autz, cid} = payload
    const {timezone, uid} = autz

    const {
      limit = 'ALL',
      offset = 0,
      sort = 'section_id',
      filter = ''
    } = payload.query

    const qSort = db_api.sorting(sort, 'courses_section')
    let qFilter =
      filter !== '' ? db_api.filtration(filter, 'courses_section') : ''
    qFilter = db_api.setFilterTz(qFilter, timezone)

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
          section_id as secid, 
          section_company_id as cid,         
          section_title as title,
          section_tags as tags, 
          section_description as description, 
          section_tags as tags, 
          courses_sections.created_at AT TIME ZONE $3 AS created_at,
          courses_sections.updated_at AT TIME ZONE $3 AS updated_at,
          courses_sections.deleted_at AT TIME ZONE $3 AS deleted_at
        FROM courses_sections, companies
        WHERE section_company_id=$1 AND companies.company_id=courses_sections.section_company_id
          AND ((courses_sections.deleted_at is NOT NULL AND companies.company_show_deleted=true) OR courses_sections.deleted_at IS NULL) 
        ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
        [cid, offset, timezone]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async coursesSectionById(payload) {
    const {autz, cid, secid} = payload
    const {timezone, uid} = autz

    if (autz.company_id !== cid || !autz.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT         
        section_id as secid, 
          section_company_id as cid,         
          section_title as title,
          section_tags as tags, 
          section_description as description, 
          section_tags as tags, 
          courses_sections.created_at AT TIME ZONE $3 AS created_at,
          courses_sections.updated_at AT TIME ZONE $3 AS updated_at,
          courses_sections.deleted_at AT TIME ZONE $3 AS deleted_at
        FROM courses_sections
        WHERE section_company_id=$1 and section_id=$2;`,
        [cid, secid, timezone]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async addSection(payload) {
    let client = undefined
    const {autz, section} = payload
    const {cid, title, tags = [], description} = section

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'created',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: title,
      details: 'Failure',
      target_data: {...section}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      const {rows: cntExName} = await client.query(
        `SELECT count(*) cnt 
        FROM courses_sections 
        WHERE section_title=$1 and section_company_id=$2;`,
        [title, cid]
      )
      if (cntExName[0].cnt > 0) {
        histData.details = `Error [Course section title already exists]`
        throw Error(errors.THIS_COURSE_NAME_IS_NOT_ALLOWED)
      }

      const {rows} = await client.query(
        `INSERT INTO courses_sections (section_company_id, section_title, section_tags, section_description) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *;`,
        [cid, title, tags, description]
      )
      histData.result = typeof rows[0] === 'object'
      histData.object_name = `cr-sec_${rows[0].section_id}`
      histData.target_data = {
        ...histData.target_data,
        secid: rows[0].section_id
      }
      histData.details = 'Success'

      return rows[0].section_id
    } catch (error) {
      throw Error(error.message)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async updSection(payload) {
    let client = undefined
    const {autz, section} = payload
    const {secid, cid, title, tags = [], description} = section

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'edited',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: title,
      details: 'Failure [name]',
      target_data: {...section}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      const {rows: cntExName} = await client.query(
        `SELECT count(*) cnt 
        FROM courses_sections 
        WHERE section_title=$1 and section_company_id=$2 
          and section_id<>$3 and deleted_at is null;`,
        [title, cid, secid]
      )

      if (cntExName[0].cnt > 0) {
        histData.details = `Error [Course name already exists]`
        throw Error(errors.THIS_COURSE_NAME_IS_NOT_ALLOWED)
      }

      const {rows} = await client.query(
        `UPDATE courses_sections 
          SET section_title=$3, section_tags=$4, section_description=$5 
          WHERE section_company_id=$2 and section_id =$1
          AND deleted_at IS NULL
          RETURNING *;`,
        [secid, cid, title, tags, description]
      )

      histData.object_name = `cr-sec_${rows[0].section_id}`
      histData.result = rows.length === 1
      histData.details = `[${title}] information updated`
      return rows.length
    } catch (error) {
      throw Error(error.message)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async delSection(payload) {
    let client = undefined
    const {autz, section} = payload
    const {secid, cid} = section

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
      target_data: {...section}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      //* Change for sections*/

      // const {rows: usrs} = await client.query(
      //   `SELECT count(users.user_id) cnt
      //     FROM groups, users
      //     WHERE group_company_id=$2 AND group_gid=$1
      //       AND group_gid = ANY(user_groups)
      //       AND users.deleted_at is null;`,
      //   [gid, cid]
      // )
      // if (Array.isArray(usrs) && usrs[0].cnt > 0) {
      //   throw Error(errors.CANNOT_DELETE_A_GROUP_WITH_EXISTING_USERS)
      // }

      // const {rows: grpr} = await client.query(
      //   `SELECT count(course_id) cnt
      //     FROM courses
      //     WHERE group_parent = $1;`,
      //   [gid]
      // )

      // if (grpr[0].cnt !== '0') {
      //   histData.details = `Error [Group has children]`
      //   throw Error(errors.THIS_GROUP_HAS_CHILDREN)
      // }

      const {rows} = await client.query(
        `UPDATE courses_sections 
        SET deleted_at = now()
        WHERE section_company_id=$2 and section_id =$1 
        and deleted_at is null
        RETURNING *;`,
        [secid, cid]
      )

      histData.object_name = `cr-sec_${secid}`
      histData.result = rows.length === 1
      histData.details = 'Success'
      return rows.length
    } catch (error) {
      throw Error(error.message)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }
}

module.exports = CoursesSectionsService
