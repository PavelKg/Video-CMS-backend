'use strict'
const errors = require('../../errors')
const db_api = require('../../db_api')

class CourseService {
  constructor(db, histLogger) {
    this.db = db
    this.history_category = 'Courses'
    this.histLogger = histLogger
  }

  async companyCourses(payload) {
    const {autz, cid} = payload
    const {timezone, uid} = autz

    const {
      limit = 'ALL',
      offset = 0,
      sort = 'course_id',
      filter = ''
    } = payload.query

    const qSort = db_api.sorting(sort, 'courses')

    let qFilter = filter !== '' ? db_api.filtration(filter, 'courses') : ''
    qFilter = db_api.setFilterTz(qFilter, timezone)

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        course_id as crid, 
        course_company_id as cid,         
        course_name as name,
        course_tags as tags, 
        course_teachers as teachers,
        course_details as details,
        course_is_published as is_published,
        courses.created_at AT TIME ZONE $3 AS created_at,
        courses.updated_at AT TIME ZONE $3 AS updated_at,
        courses.deleted_at AT TIME ZONE $3 AS deleted_at
        FROM courses, companies
        WHERE course_company_id=$1 AND companies.company_id=courses.course_company_id
          AND ((courses.deleted_at is NOT NULL AND companies.company_show_deleted=true) OR courses.deleted_at IS NULL) 
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

  async companyCourseById(payload) {
    const {autz, cid, crid} = payload
    const {timezone, uid} = autz
    if (autz.company_id !== cid || !autz.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT         
        course_id as crid, 
        course_company_id as cid,         
        course_name as name,
        course_tags as tags, 
        course_teachers as teachers,
        course_is_published as is_published,
        course_details as details,        
        courses.created_at AT TIME ZONE $3 AS created_at,
        courses.updated_at AT TIME ZONE $3 AS updated_at,
        courses.deleted_at AT TIME ZONE $3 AS deleted_at
        FROM courses
        WHERE course_company_id=$1 and course_id=$2;`,
        [cid, crid, timezone]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async addCourse(payload) {
    let client = undefined
    const {autz, course} = payload
    const {cid, name, tags = [], teachers = []} = course

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'created',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: name,
      details: 'Failure',
      target_data: {...course}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      const {rows: cntExName} = await client.query(
        `SELECT count(*) cnt 
        FROM courses 
        WHERE course_name=$1 and course_company_id=$2;`,
        [name, cid]
      )
      if (cntExName[0].cnt > 0) {
        histData.details = `Error [Course name already exists]`
        throw Error(errors.THIS_COURSE_NAME_IS_NOT_ALLOWED)
      }

      const {rows} = await client.query(
        `INSERT INTO courses (course_company_id, course_name, course_tags, course_teachers) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *;`,
        [cid, name, tags, teachers]
      )
      histData.result = typeof rows[0] === 'object'
      histData.object_name = `cr_${rows[0].course_id}`
      histData.target_data = {...histData.target_data, crid: rows[0].course_id}
      histData.details = 'Success'

      return rows[0].course_id
    } catch (error) {
      throw Error(error.message)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async updCourse(payload) {
    let client = undefined
    const {autz, course} = payload
    const {
      crid,
      cid,
      name,
      tags = '',
      teachers = [],
      details = '',
      is_published = false
    } = course

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'edited',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: name,
      details: 'Failure [name]',
      target_data: {...course}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      const {rows: cntExName} = await client.query(
        `SELECT count(*) cnt 
        FROM courses 
        WHERE course_name=$1 and course_company_id=$2 
          and course_id<>$3 and deleted_at is null;`,
        [name, cid, crid]
      )

      if (cntExName[0].cnt > 0) {
        histData.details = `Error [Course name already exists]`
        throw Error(errors.THIS_COURSE_NAME_IS_NOT_ALLOWED)
      }

      const {rows} = await client.query(
        `UPDATE courses 
          SET course_name=$3, course_tags=$4, course_teachers=$5, 
            course_details=$6, course_is_published=$7 
          WHERE course_company_id=$2 and course_id =$1
          AND deleted_at IS NULL
          RETURNING *;`,
        [crid, cid, name, tags, teachers, details, is_published]
      )

      histData.object_name = `cr_${rows[0].course_id}`
      histData.result = rows.length === 1
      histData.details = `[${name}] information updated`
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

  async delCourse(payload) {
    let client = undefined
    const {autz, course} = payload
    const {crid, cid} = course

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
      target_data: {...course}
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
        `UPDATE courses 
        SET deleted_at = now()
        WHERE course_company_id=$2 and course_id =$1 
        and deleted_at is null
        RETURNING *;`,
        [crid, cid]
      )

      histData.object_name = `cr_${crid}`
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

  async getCourseSections(payload) {
    const {autz, cid, crid} = payload
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
          section_description as description, 
          section_uuid as uuid,
          coalesce(jsonb_array_length(section_modules),0) as modules_length,
          courses_sections.created_at AT TIME ZONE $3 AS created_at,
          courses_sections.updated_at AT TIME ZONE $3 AS updated_at,
          courses_sections.deleted_at AT TIME ZONE $3 AS deleted_at
        FROM courses, courses_sections
        JOIN UNNEST(course_sections::uuid[]) 
		    WITH ORDINALITY t(section_uuid, ord) USING (section_uuid)
        WHERE section_company_id=$1 and course_id=$2
        ORDER  BY t.ord;`,
        [cid, crid, timezone]
      )

      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async updCourseSections(payload) {
    const {autz, cid, crid, secid, act} = payload
    const {timezone, uid} = autz

    if (autz.company_id !== cid || !autz.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    let query = ''
    switch (act) {
      case 'up':
        query = `
          with elem as (
            select array_position(course_sections, $3) as pos from courses where course_id = $2
          )
          update courses 
          set course_sections[elem.pos-1:elem.pos] =  
            ARRAY[course_sections[elem.pos], course_sections[elem.pos-1]]
            from elem
          where course_company_id=$1 AND deleted_at IS NULL AND
          course_id = $2 and elem.pos>1
          RETURNING * ;`
        break
      case 'down':
        query = `
          with elem as (
            select array_position(course_sections, $3) as pos from courses where course_id = $2
          )
          update courses 
          set course_sections[elem.pos:elem.pos+1] =  
            ARRAY[course_sections[elem.pos+1], course_sections[elem.pos]]
            from elem
          where course_company_id=$1 AND deleted_at IS NULL AND
          course_id = $2 and elem.pos<array_length(course_sections,1)
          RETURNING * ;`

        break
      case 'add':
        query = `
            update courses
            set course_sections = array_append(course_sections, $3)   
            where course_company_id=$1 AND deleted_at IS NULL AND
            course_id = $2
            RETURNING *`
        break
      case 'del':
        query = `
            update courses
            set course_sections = array_remove(course_sections, $3)   
            where course_company_id=$1 AND deleted_at IS NULL AND
            course_id = $2
            RETURNING *`
        break
      default:
        break
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(query, [cid, crid, secid])
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }
}

module.exports = CourseService
