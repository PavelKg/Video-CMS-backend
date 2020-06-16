'use strict'
const errors = require('../../errors')
const db_api = require('../../db_api')

class RoleService {
  constructor(db, histLogger) {
    this.db = db
    this.history_category = 'Roles'
    this.histLogger = histLogger
  }

  async companyRoles(payload) {
    const {autz, cid} = payload
    const {timezone} = autz
    const {
      limit = 'ALL',
      offset = 0,
      sort = 'role_rid',
      filter = ''
    } = payload.query

    if (autz.company_id !== cid || !autz.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const qSort = db_api.sorting(sort, 'roles')
    let qFilter = filter !== '' ? db_api.filtration(filter, 'roles') : ''
    qFilter = db_api.setFilterTz(qFilter, timezone)

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `select 
          role_rid as rid, 
          role_name as name, 
          role_company_id as cid, 
          role_is_admin as is_admin, 
          roles.deleted_at AT TIME ZONE $3 AS deleted_at 
        FROM roles, companies
        WHERE role_company_id=$1 AND companies.company_id=roles.role_company_id
          AND ((roles.deleted_at is NOT NULL AND companies.company_show_deleted=true) OR roles.deleted_at IS NULL) 
          ${qFilter} ORDER BY ${qSort} LIMIT ${limit} OFFSET $2;`,
        [cid, offset, timezone]
      )

      const cRoles = rows

      if (!cRoles) throw new Error(errors.WRONG_LOAD_ROLES)
      return cRoles
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }

  async companyRoleById(payload) {
    const {autz, cid, rid} = payload
    const {timezone} = autz

    if (autz.company_id !== cid || !autz.is_admin) {
      throw Error(errors.WRONG_ACCESS)
    }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `select role_rid as rid, 
          role_name as name, 
          role_company_id as cid, 
          role_is_admin as is_admin, 
          role_permissions as permits,
          deleted_at AT TIME ZONE $3 AS deleted_at 
        from roles
        where role_company_id=$1 and role_rid=$2;`,
        [cid, rid, timezone]
      )
      return rows
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
    }
  }

  async features(payload) {
    const {autz, cid} = payload

    // if (autz.company_id !== cid || !autz.is_admin) {
    //   throw Error(errors.WRONG_ACCESS)
    // }

    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `WITH RECURSIVE feature_with_level AS (
          SELECT feature_name AS "name", feature_caption caption, 
            feature_menu_order "order", feature_parent parent, feature_id "id",
            0 AS lvl
          FROM features
          WHERE feature_parent IS NULL
  
          UNION ALL
  
          SELECT child.feature_name "name", child.feature_caption caption, 
            child.feature_menu_order "order", child.feature_parent parent, child.feature_id "id",
            parent.lvl + 1
          FROM features child
          JOIN feature_with_level parent 
          ON parent.id = child.feature_parent
        ),
        maxlvl AS (
          SELECT max(lvl) maxlvl FROM feature_with_level
        ),
  
        c_tree AS (
          SELECT feature_with_level.*,
           NULL::JSONB children
          FROM feature_with_level, maxlvl
          WHERE lvl = maxlvl
  
          UNION
  
          (
          SELECT (branch_parent).*,
              jsonb_agg(branch_child)
          FROM (
           SELECT branch_parent,
                  to_jsonb(branch_child) - 'lvl' - 'parent' - 'id' AS branch_child
             FROM feature_with_level branch_parent
             JOIN c_tree branch_child ON branch_child.parent = branch_parent.id
          ) branch
          GROUP BY branch.branch_parent
  
         UNION
  
         SELECT c.*,
                NULL::JSONB
         FROM feature_with_level c
         WHERE NOT EXISTS (SELECT 1
          FROM feature_with_level hypothetical_child
          WHERE hypothetical_child.parent = c.id)
          )
        )
  
        SELECT 
          array_to_json(
            array_agg(
              row_to_json(c_tree)::JSONB - 'lvl' - 'parent_id' - 'node_id' - 'id' - 'parent'
            )
          )::JSONB AS features
        FROM c_tree
        WHERE lvl=0;`
      )
      return rows[0].features
    } catch (error) {
      throw Error(error)
    } finally {
      if (client) {
        client.release()
      }
    }
  }

  async addRole(payload) {
    let client = undefined
    const {autz, role} = payload
    const {rid, cid, name, is_admin = false, permits = null} = role

    if (!is_admin) {
      permits = null
    }

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'created',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: rid,
      details: 'Failure',
      target_data: {}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      const {rows: cntExRid} = await client.query(
        `SELECT count(*) cnt 
        FROM roles 
        WHERE role_rid=$1 and role_company_id=$2;`,
        [rid, cid]
      )

      if (cntExRid[0].cnt > 0) {
        histData.details = `Error [Role rid already exists]`
        throw Error(errors.THIS_ROLE_RID_IS_NOT_ALLOWED)
      }

      const {rows} = await client.query(
        `INSERT INTO roles (role_rid, role_company_id, role_name, role_is_admin, role_permissions) 
          VALUES ($1, $2, $3, $4, $5) 
        RETURNING role_rid AS rid, 
        role_id, 
        role_is_admin AS is_admin, 
        role_company_id AS cid, 
        role_name AS name;`,
        [rid, cid, name, is_admin, permits]
      )

      histData.result = typeof rows[0] === 'object'
      histData.target_data = {...rows[0]}
      histData.details = 'Success'

      // generate new user's frontend menu
      await client.query(
        `UPDATE roles SET role_menu = (select generate_role_menu($1)) 
          WHERE role_id=$1`,
        [rows[0].role_id]
      )

      return rows[0].rid
    } catch (error) {
      throw Error(error)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async updRole(payload) {
    let client = undefined
    const {autz, role} = payload
    const {rid, cid, name, is_admin = false, permits = null} = role

    // if (!is_admin) {
    //   permits = null
    // }

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'edited',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: rid,
      details: `Failure [${name}]`,
      target_data: {...role}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()
      const {rows} = await client.query(
        `UPDATE roles 
        SET role_name=$3, role_is_admin=$4, role_permissions=$5
        WHERE role_company_id=$2 and role_rid =$1 
          AND deleted_at IS NULL
          RETURNING role_id;`,
        [rid, cid, name, is_admin, permits]
      )
      histData.result = rows.length === 1
      histData.details = `[${name}] information updated`

      // generate new user's frontend menu
      if (rows.length === 1) {
        await client.query(
          `UPDATE roles SET role_menu = (select generate_role_menu($1))
          WHERE role_id=$1`,
          [rows[0].role_id]
        )
      }
      return rows.length
    } catch (error) {
      throw Error(error)
    } finally {
      client.release()
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async delRole(payload) {
    let client = undefined
    const {autz, role} = payload
    const {rid, cid} = role

    const {user_id, company_id, uid} = autz
    let histData = {
      category: this.history_category,
      action: 'deleted',
      result: false,
      user_id,
      user_uid: uid,
      cid: company_id,
      object_name: rid,
      details: 'Failure',
      target_data: {...role}
    }

    try {
      if (autz.company_id !== cid || !autz.is_admin) {
        throw Error(errors.WRONG_ACCESS)
      }

      client = await this.db.connect()

      const {rows: usrs} = await client.query(
        `select count(users.user_id) cnt 
       from roles, users 
       where role_company_id=$2 and role_rid=$1 
        and user_role_id = role_id and users.deleted_at is null;`,
        [rid, cid]
      )
      if (Array.isArray(usrs) && usrs[0].cnt > 0) {
        throw Error(errors.CANNOT_DELETE_A_ROLE_WITH_EXISTING_USERS)
      }

      const {rowCount} = await client.query(
        `UPDATE roles 
        SET deleted_at = now() 
        WHERE role_company_id=$2 and role_rid =$1 
        and deleted_at is null;`,
        [rid, cid]
      )
      histData.result = rowCount === 1
      histData.details = 'Success'
      return rowCount
    } catch (error) {
      throw Error(error)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }
}

module.exports = RoleService
