'use strict'

const roleObject = {
  type: 'object',
  properties: {
    rid: {type: 'string'},
    name: {type: 'string'},
    is_admin: {type: 'boolean'},
    deleted_at: {type: 'string'}
  }
}

const role = {
  type: 'object',
  properties: {
    rid: {type: 'string'},
    name: {type: 'string'},
    is_admin: {type: 'boolean'}
  },
  required: ['rid', 'name'],
  additionalProperties: false
}

const getCompanyRoles = {
  params: {
    type: 'object',
    required: ['cid'],
    properties: {
      cid: {
        type: 'string',
        pattern: '^[0-9]?'
      }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'array',
      items: roleObject
    }
  }
}

const addRole = {
  params: {
    type: 'object',
    required: ['cid'],
    properties: {
      cid: {
        type: 'string',
        pattern: '^[0-9]?'
      }
    },
    additionalProperties: false
  },
  body: role
}

const updRole = {
  params: {
    type: 'object',
    required: ['cid', 'rid'],
    properties: {
      cid: {
        type: 'string',
        pattern: '^[0-9]?'
      },
      rid: {type: 'string'}
    },
    additionalProperties: false
  },
  body: {
    type: 'object',
    properties: {
      name: {type: 'string'},
      is_admin: {type: 'boolean'}
    },
    required: ['name']
  }
}

const delRole = {
  params: {
    type: 'object',
    required: ['cid', 'rid'],
    properties: {
      cid: {
        type: 'string',
        pattern: '^[0-9]?'
      },
      rid: {type: 'string'}
    },
    additionalProperties: false
  }
}


module.exports = {
  getCompanyRoles,
  addRole,
  updRole,
  delRole
}
