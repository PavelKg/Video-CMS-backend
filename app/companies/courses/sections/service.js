'use strict'
const errors = require('../../../errors')
const db_api = require('../../../db_api')

class CourseSectionsService {
  constructor(db, histLogger) {
    this.db = db
    this.history_category = 'Courses'
    this.histLogger = histLogger
  }

  async getSections(payload) {
    const {autz, cid, crid} = payload
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
          section_company_id as cid,         
          section_title as title,
          section_tags as tags, 
          section_description as description, 
          section_tags as tags, 
          section_uuid as uuid,
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

  async getSectionsModel(payload) {
    const {autz, cid} = payload
    const {timezone, uid} = autz

    if (autz.company_id !== cid || !autz.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT section_type_value as fields
        FROM course_section_type
        WHERE section_type_name='default';`,
        []
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async getSectionById(payload) {
    const {autz, cid, uuid} = payload
    const {timezone, uid} = autz

    if (autz.company_id !== cid || !autz.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT         
          section_company_id as cid,         
          section_title as title,
          section_tags as tags, 
          section_description as description, 
          section_tags as tags, 
          section_uuid as uuid,
          courses_sections.created_at AT TIME ZONE $3 AS created_at,
          courses_sections.updated_at AT TIME ZONE $3 AS updated_at,
          courses_sections.deleted_at AT TIME ZONE $3 AS deleted_at
        FROM courses_sections
        WHERE section_company_id=$1 and section_uuid=$2;`,
        [cid, uuid, timezone]
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
    const {cid, title, tags, description, uuid} = section

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
        WHERE section_uuid=$1 and section_company_id=$2;`,
        [uuid, cid]
      )
      if (cntExName[0].cnt > 0) {
        histData.details = `Error [Course section title already exists]`
        throw Error(errors.THIS_COURSE_SECTION_UUID_IS_NOT_ALLOWED)
      }

      const {rows} = await client.query(
        `INSERT INTO courses_sections (section_company_id, section_title, section_tags, section_description, section_uuid) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *;`,
        [cid, title, tags, description, uuid]
      )
      histData.result = typeof rows[0] === 'object'
      histData.object_name = `cr-sec_${rows[0].section_uuid}`
      histData.target_data = {
        ...histData.target_data,
        uuid: rows[0].section_uuid
      }
      histData.details = 'Success'

      return rows[0].section_uuid
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
    const {uuid, cid, title, tags, description} = section

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

      // const {rows: cntExName} = await client.query(
      //   `SELECT count(*) cnt
      //   FROM courses_sections
      //   WHERE section_uuid=$1 and section_company_id=$2
      //     and section_id<>$3 and deleted_at is null;`,
      //   [title, cid, secid]
      // )

      // if (cntExName[0].cnt > 0) {
      //   histData.details = `Error [Course name already exists]`
      //   throw Error(errors.THIS_COURSE_NAME_IS_NOT_ALLOWED)
      // }

      const {rows} = await client.query(
        `UPDATE courses_sections 
          SET section_title=$3, section_tags=$4, section_description=$5 
          WHERE section_company_id=$2 and section_uuid =$1
          AND deleted_at IS NULL
          RETURNING *;`,
        [uuid, cid, title, tags, description]
      )

      if (rows.length > 0) {
        histData.object_name = `cr-sec_${rows[0].section_uuid}`
        histData.details = `[${title}] information updated`
      }
      histData.result = rows.length === 1
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
    const {uuid, cid} = section

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

      const {rows: courses} = await client.query(
        `SELECT count(courses.course_id) cnt
          FROM courses
          WHERE course_company_id=$2 
            AND course_sections @> ARRAY[$1]::text[]
            AND courses.deleted_at is null;`,
        [uuid, cid]
      )

      if (Array.isArray(courses) && courses[0].cnt > 0) {
        throw Error(errors.CANNOT_DELETE_THE_USED_COURSE_SECTION)
      }

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
        WHERE section_company_id=$2 and section_uuid=$1 
        and deleted_at is null
        RETURNING *;`,
        [uuid, cid]
      )

      histData.object_name = `cr-sec_${uuid}`
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

  async getSectionModules(payload) {
    const {autz, cid, secid} = payload
    const {timezone, uid} = autz

    if (autz.company_id !== cid) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT         
          module_id as modid,
          module_instructor_note as instructor_note,
          coalesce(jsonb_array_length(module_lessons),0) as lessons_length,
          courses_modules.created_at AT TIME ZONE $3 AS created_at,
          courses_modules.updated_at AT TIME ZONE $3 AS updated_at,
          courses_modules.deleted_at AT TIME ZONE $3 AS deleted_at
        FROM courses_sections, courses_modules
        JOIN UNNEST(section_modules::uuid[]) 
        WITH ORDINALITY t(module_id, ord) USING (module_id)
        WHERE section_company_id=$1 and section_uuid=$2
        ORDER  BY t.ord;`,
        [cid, secid, timezone]
      )

      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async updSectionModules(payload) {
    const {autz, cid, secid, modid, act} = payload
    const {timezone, uid} = autz

    if (autz.company_id !== cid || !autz.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    let query = ''
    switch (act) {
      case 'up':
        query = `
          with elem as (
            select array_position(section_modules, $3) as pos from courses_sections where section_uuid = $2
          )
          update courses_sections 
          set section_modules[elem.pos-1:elem.pos] =  
            ARRAY[section_modules[elem.pos], section_modules[elem.pos-1]]
            from elem
          where section_company_id=$1 AND deleted_at IS NULL AND
          section_uuid = $2 and elem.pos>1
          RETURNING * ;`
        break
      case 'down':
        query = `
          with elem as (
            select array_position(section_modules, $3) as pos from courses_sections where section_uuid = $2
          )
          update courses_sections 
          set section_modules[elem.pos:elem.pos+1] =  
            ARRAY[section_modules[elem.pos+1], section_modules[elem.pos]]
            from elem
          where section_company_id=$1 AND deleted_at IS NULL AND
          section_uuid = $2 and elem.pos<array_length(section_modules,1)
          RETURNING * ;`

        break
      case 'add':
        query = `
            update courses_sections
            set section_modules = array_append(section_modules, $3)   
            where section_company_id=$1 AND deleted_at IS NULL AND
            section_uuid = $2
            RETURNING *`
        break
      case 'del':
        query = `
            update courses_sections
            set section_modules = array_remove(section_modules, $3)   
            where section_company_id=$1 AND deleted_at IS NULL AND
            section_uuid = $2
            RETURNING *`
        break
      default:
        break
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(query, [cid, secid, modid])
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }
}

module.exports = CourseSectionsService
