'use strict'
const errors = require('../../errors')
const db_api = require('../../db_api')

class CourseService {
  constructor(db, histLogger) {
    this.db = db
    this.history_category = 'Courses'
    this.histLogger = histLogger
  }

  async courses(payload) {
    const {autz, query} = payload
    const {timezone, company_id: cid} = autz

    const {limit = 'ALL', offset = 0, sort = 'course_name', filter = ''} = query

    const qSort = db_api.sorting(sort, 'courses')

    let qFilter = filter !== '' ? db_api.filtration(filter, 'courses') : ''
    qFilter = db_api.setFilterTz(qFilter, timezone)

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        course_name as name,
        course_title as title,
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

  async usersCourses(payload) {
    const {autz, query, category} = payload
    const {timezone, company_id: cid, uid} = autz

    const {limit = 'ALL', offset = 0, sort = 'course_name', filter = ''} = query

    const qSort = db_api.sorting(sort, 'courses')

    let qFilter = filter !== '' ? db_api.filtration(filter, 'courses') : ''
    qFilter = db_api.setFilterTz(qFilter, timezone)

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        course_name as name,
        course_title as title,
        course_tags as tags, 
        course_teachers as teachers,
        course_details as details
        FROM courses, companies
        WHERE course_company_id=$1 AND companies.company_id=courses.course_company_id
          AND EXISTS (
            SELECT  -- SELECT list mostly irrelevant; can just be empty in Postgres
            FROM   users_achievements
            WHERE  course_name = ach_course_name AND ach_user_company_id=$1 
              AND ach_user_uid=$3 AND COALESCE(ach_course_completed, false)=$4
          )
          --AND course_is_published=true 
        ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
        [cid, offset, uid, category === 'completed']
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async coursesCatalog(payload) {
    const {autz, query} = payload
    const {timezone, company_id: cid, uid} = autz

    const {limit = 'ALL', offset = 0, sort = 'course_name', filter = ''} = query

    const qSort = db_api.sorting(sort, 'courses')

    let qFilter = filter !== '' ? db_api.filtration(filter, 'courses') : ''
    qFilter = db_api.setFilterTz(qFilter, timezone)

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
        course_name as name,
        course_title as title,
        course_tags as tags, 
        course_teachers as teachers,
        course_details as details
        FROM courses, companies
        WHERE course_company_id=$1 AND companies.company_id=courses.course_company_id
          AND NOT EXISTS (
            SELECT  -- SELECT list mostly irrelevant; can just be empty in Postgres
            FROM   users_achievements
            WHERE  course_name = ach_course_name and ach_user_company_id=$1 and ach_user_uid=$3
          )
          AND ((courses.deleted_at is NOT NULL AND companies.company_show_deleted=true) OR courses.deleted_at IS NULL)
          AND course_is_published=true 
        ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
        [cid, offset, uid]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async courseById(payload) {
    const {autz, name} = payload
    const {timezone, company_id: cid} = autz
    if (!autz.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT         
        course_id as crid, 
        course_company_id as cid,         
        course_name as name,
        course_title as title,
        course_tags as tags, 
        course_teachers as teachers,
        course_is_published as is_published,
        course_details as details,        
        courses.created_at AT TIME ZONE $3 AS created_at,
        courses.updated_at AT TIME ZONE $3 AS updated_at,
        courses.deleted_at AT TIME ZONE $3 AS deleted_at
        FROM courses
        WHERE course_company_id=$1 and course_name=$2;`,
        [cid, name, timezone]
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
    const {name, title, tags = [], teachers = []} = course

    const {user_id, company_id: cid, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'created',
      result: false,
      user_id,
      user_uid: uid,
      cid: cid,
      object_name: name,
      details: 'Failure',
      target_data: {...course}
    }

    try {
      if (!autz.is_admin) {
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
        `INSERT INTO courses (course_company_id, course_name, course_title, course_tags, course_teachers) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *;`,
        [cid, name, title, tags, teachers]
      )
      histData.result = typeof rows[0] === 'object'
      histData.object_name = `cr-${rows[0].course_name}`
      histData.target_data = {
        ...histData.target_data,
        name: rows[0].course_name
      }
      histData.details = 'Success'

      return rows[0].course_name
    } catch (error) {
      throw Error(error.message)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async applyCourse(payload) {
    let client = undefined
    const {autz, name} = payload

    const {user_id, company_id: cid, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'apply',
      result: false,
      user_id,
      user_uid: uid,
      cid: cid,
      object_name: name,
      details: 'Failure [name]',
      target_data: {name}
    }

    try {
      client = await this.db.connect()

      const {rows: cntExName} = await client.query(
        `SELECT count(*) cnt
        FROM users_achievements
        WHERE ach_course_name=$1 and ach_user_company_id=$2
          and ach_user_uid=$3 and deleted_at is null;`,
        [name, cid, uid]
      )

      if (cntExName[0].cnt > 0) {
        histData.details = `Error [The course has already been applied]`
        throw Error(errors.THE_COURSE_HAS_ALREADY_BEEN_APPLIED)
      }

      const {rows} = await client.query(
        `WITH sec as (
          SELECT section_uuid, section_title, section_description, section_modules, s_ord, course_name--, module_id, module_lessons
          FROM courses c, courses_sections s
          JOIN unnest(c.course_sections::uuid[]) WITH ORDINALITY  t(section_uuid, s_ord) USING (section_uuid)
          WHERE course_name=$2 AND course_company_id=$1
          ),
          mod as (
          SELECT section_uuid,  module_instructor_note,module_lessons, t.module_id, m_ord
          FROM sec s, courses_modules m
          JOIN unnest(s.section_modules::uuid[]) WITH ORDINALITY  t(module_id,  m_ord) USING (module_id))
          
          INSERT INTO users_achievements (ach_course_name, ach_user_uid, ach_user_company_id, ach_course_content)
          SELECT course_name, uid, company_id, sections FROM (
            SELECT $2 as course_name, $3 AS uid, $1 AS company_id, jsonb_agg(jsonb_build_object('id', section_uuid, 'title', section_title, 'description', section_description, 'modules', modules)) as sections from (
              SELECT section_uuid,section_title, section_description, s_ord,
                COALESCE(jsonb_agg(jsonb_build_object('id', module_id, 'instructor_note', module_instructor_note, 'lessons', module_lessons)) FILTER (WHERE module_id IS NOT NULL), '[]') as modules 
              FROM (
                SELECT * FROM sec
                LEFT JOIN mod USING(section_uuid)
              order by s_ord, m_ord	
              ) abc
              GROUP BY section_uuid,section_title, section_description,s_ord
              order by s_ord) section_list) bbb
          WHERE sections is not null 	
          RETURNING *;`,
        [cid, name, uid]
      )

      histData.object_name = `cr-${name}`
      histData.result = rows.length === 1
      histData.details = `[${name}] course applied`
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

  async updCourse(payload) {
    let client = undefined
    const {autz, course} = payload
    const {
      name,
      title = '',
      tags = '',
      teachers = [],
      details = '',
      is_published = false
    } = course

    const {user_id, company_id: cid, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'edited',
      result: false,
      user_id,
      user_uid: uid,
      cid: cid,
      object_name: name,
      details: 'Failure [name]',
      target_data: {...course}
    }

    try {
      if (!autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      // const {rows: cntExName} = await client.query(
      //   `SELECT count(*) cnt
      //   FROM courses
      //   WHERE course_name=$1 and course_company_id=$2
      //     and course_id<>$3 and deleted_at is null;`,
      //   [name]
      // )

      // if (cntExName[0].cnt > 0) {
      //   histData.details = `Error [Course name already exists]`
      //   throw Error(errors.THIS_COURSE_NAME_IS_NOT_ALLOWED)
      // }

      const {rows} = await client.query(
        `UPDATE courses 
          SET course_tags=$3, course_teachers=$4, 
            course_details=$5, course_is_published=$6, 
            course_title = $7
          WHERE course_company_id=$1 and course_name =$2
          AND deleted_at IS NULL
          RETURNING *;`,
        [cid, name, tags, teachers, details, is_published, title]
      )

      histData.object_name = `cr-${name}`
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
    const {autz, name} = payload

    const {user_id, company_id: cid, uid} = autz

    let histData = {
      category: this.history_category,
      action: 'deleted',
      result: false,
      user_id,
      user_uid: uid,
      cid: cid,
      object_name: '',
      details: 'Failure',
      target_data: {name}
    }

    try {
      if (!autz.is_admin) {
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
        WHERE course_company_id=$2 and course_name =$1 
        and deleted_at is null
        RETURNING *;`,
        [name, cid]
      )

      histData.object_name = `cr-${name}`
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
    const {autz, name} = payload
    const {timezone, company_id: cid} = autz

    if (!autz.is_admin) {
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
          coalesce(array_length(section_modules,1),0) as modules_length,
          courses_sections.created_at AT TIME ZONE $3 AS created_at,
          courses_sections.updated_at AT TIME ZONE $3 AS updated_at,
          courses_sections.deleted_at AT TIME ZONE $3 AS deleted_at
        FROM courses, courses_sections
        JOIN UNNEST(course_sections::uuid[]) 
		    WITH ORDINALITY t(section_uuid, ord) USING (section_uuid)
        WHERE section_company_id=$1 and course_name=$2
        ORDER  BY t.ord;`,
        [cid, name, timezone]
      )

      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async updCourseSections(payload) {
    const {autz, name, secid, act} = payload
    const {company_id: cid} = autz

    if (!autz.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    let query = ''
    switch (act) {
      case 'up':
        query = `
          with elem as (
            select array_position(course_sections, $3) as pos from courses where course_name = $2
          )
          update courses 
          set course_sections[elem.pos-1:elem.pos] =  
            ARRAY[course_sections[elem.pos], course_sections[elem.pos-1]]
            from elem
          where course_company_id=$1 AND deleted_at IS NULL AND
          course_name = $2 and elem.pos>1
          RETURNING * ;`
        break
      case 'down':
        query = `
          with elem as (
            select array_position(course_sections, $3) as pos from courses where course_name = $2
          )
          update courses 
          set course_sections[elem.pos:elem.pos+1] =  
            ARRAY[course_sections[elem.pos+1], course_sections[elem.pos]]
            from elem
          where course_company_id=$1 AND deleted_at IS NULL AND
          course_name = $2 and elem.pos<array_length(course_sections,1)
          RETURNING * ;`

        break
      case 'add':
        query = `
            update courses
            set course_sections = array_append(course_sections, $3)   
            where course_company_id=$1 AND deleted_at IS NULL AND
            course_name = $2
            RETURNING *`
        break
      case 'del':
        query = `
            update courses
            set course_sections = array_remove(course_sections, $3)   
            where course_company_id=$1 AND deleted_at IS NULL AND
            course_name = $2
            RETURNING *`
        break
      default:
        break
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(query, [cid, name, secid])
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }
}

module.exports = CourseService
