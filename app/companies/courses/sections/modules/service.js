'use strict'
const errors = require('../../../../errors')
const db_api = require('../../../../db_api')

class CourseModulesService {
  constructor(db, histLogger) {
    this.db = db
    this.history_category = 'Courses-modules'
    this.histLogger = histLogger
  }

  async getModules(payload) {
    const {autz, cid} = payload
    const {timezone} = autz

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT 
          module_company_id as cid,         
          module_instructor_note as instructor_note,
          module_id as modid,
          courses_modules.created_at AT TIME ZONE $2 AS created_at,
          courses_modules.updated_at AT TIME ZONE $2 AS updated_at,
          courses_modules.deleted_at AT TIME ZONE $2 AS deleted_at
        FROM courses_modules, companies
        WHERE module_company_id=$1 AND companies.company_id=courses_modules.module_company_id
          AND ((courses_modules.deleted_at is NOT NULL AND companies.company_show_deleted=true) OR courses_modules.deleted_at IS NULL);`,
        [cid, timezone]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async getModuleById(payload) {
    const {autz, cid, modid} = payload
    const {timezone, uid} = autz

    if (autz.company_id !== cid || !autz.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT         
          module_company_id as cid,         
          module_instructor_note as instructor_note,
          module_id as modid,
          courses_modules.created_at AT TIME ZONE $3 AS created_at,
          courses_modules.updated_at AT TIME ZONE $3 AS updated_at,
          courses_modules.deleted_at AT TIME ZONE $3 AS deleted_at
        FROM courses_modules
        WHERE module_company_id=$1 and module_id=$2;`,
        [cid, modid, timezone]
      )
      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async getModuleLessons(payload) {
    const {autz, cid, modid} = payload
    const {timezone, uid} = autz

    if (autz.company_id !== cid || !autz.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT module_lessons
        FROM courses_modules
        WHERE module_company_id=$1 and module_id=$2;`,
        [cid, modid]
      )

      return rows
    } catch (error) {
      throw Error(error.message)
    } finally {
      client.release()
    }
  }

  async updModuleLessons(payload) {
    let client = undefined
    const {autz, module} = payload
    const {modid, lessons, cid} = module
    const {user_id, company_id, uid} = autz

    let histData = {
      category: this.history_category,
      action: 'edit-lessons',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: modid,
      details: 'Failure []',
      target_data: {...module}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const {rows} = await client.query(
        `UPDATE courses_modules 
          SET module_lessons=$3::jsonb
          WHERE module_company_id=$2 and module_id =$1
          AND deleted_at IS NULL
          RETURNING *;`,
        [modid, cid, JSON.stringify(lessons)]
      )
      if (rows.length > 0) {
        histData.object_name = `cr-mod-${rows[0].module_id}`
        histData.details = `[${JSON.stringify(lessons)}] information updated`
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

  async addModule(payload) {
    let client = undefined
    const {autz, module} = payload
    const {cid, instructor_note} = module

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'created',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure',
      target_data: {...module}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      // const {rows: cntExName} = await client.query(
      //   `SELECT count(*) cnt
      //   FROM courses_sections
      //   WHERE section_uuid=$1 and section_company_id=$2;`,
      //   [uuid, cid]
      // )
      // if (cntExName[0].cnt > 0) {
      //   histData.details = `Error [Course section title already exists]`
      //   throw Error(errors.THIS_COURSE_SECTION_UUID_IS_NOT_ALLOWED)
      // }

      const {rows} = await client.query(
        `INSERT INTO courses_modules (module_company_id, module_id, module_instructor_note) 
        VALUES ($1, gen_random_uuid() , $2::jsonb) 
        RETURNING *;`,
        [cid, instructor_note]
      )
      histData.result = typeof rows[0] === 'object'
      histData.object_name = `cr-mod-${rows[0].module_id}`
      histData.target_data = {
        ...histData.target_data,
        uuid: rows[0].module_id
      }
      histData.details = 'Success'

      return rows[0].module_id
    } catch (error) {
      throw Error(error.message)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async updModule(payload) {
    let client = undefined
    const {autz, module} = payload
    const {modid, instructor_note, cid} = module
    const {user_id, company_id, uid} = autz

    let histData = {
      category: this.history_category,
      action: 'edit',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: modid,
      details: 'Failure []',
      target_data: {...module}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const {rows} = await client.query(
        `UPDATE courses_modules 
          SET module_instructor_note=$3 
          WHERE module_company_id=$2 and module_id =$1
          AND deleted_at IS NULL
          RETURNING *;`,
        [modid, cid, instructor_note]
      )

      if (rows.length > 0) {
        histData.object_name = `cr-mod-${rows[0].module_id}`
        histData.details = `[${instructor_note}] information updated`
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

  async delModule(payload) {
    let client = undefined
    const {autz, module} = payload
    const {modid, cid} = module

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'delete',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: '',
      details: 'Failure',
      target_data: {...module}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      //* Change for sections*/

      const {rows: modules} = await client.query(
        `SELECT count(courses_sections.section_id) cnt
          FROM courses_sections
          WHERE section_company_id=$2 
            AND section_modules @> ARRAY[$1]::text[]
            AND courses_sections.deleted_at is null;`,
        [modid, cid]
      )

      if (Array.isArray(modules) && modules[0].cnt > 0) {
        throw Error(errors.CANNOT_DELETE_THE_USED_COURSE_MODULE)
      }

      const {rows} = await client.query(
        `UPDATE courses_modules 
        SET deleted_at = now()
        WHERE module_company_id=$2 and module_id=$1 
        and deleted_at is null
        RETURNING *;`,
        [modid, cid]
      )

      histData.object_name = `cr-mod-${modid}`
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

module.exports = CourseModulesService
