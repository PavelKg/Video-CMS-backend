'use strict'

const queryStringJsonSchema = {
  sort: {description: 'Fields sorting', type: 'string'},
  limit: {type: 'integer'},
  offset: {type: 'integer'},
  filter: {type: 'string'}
}

const roleObject = {
  type: 'object',
  properties: {
    rid: {type: 'string'},
    cid: {type: 'string'},    
    name: {type: 'string'},
    is_admin: {type: 'boolean'},
    deleted_at: {type: 'string'}
  }
}

const role = {
  type: 'object',
  properties: {
    rid: {type: 'string'},
    cid: {type: 'string'},        
    name: {type: 'string'},
    is_admin: {type: 'boolean'}
  },
  required: ['rid', 'name'],
  additionalProperties: false
}

const getCompanyRoles = {
  tags: ['roles'],
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
  querystring: queryStringJsonSchema,
  response: {
    200: {
      type: 'array',
      items: roleObject
    }
  }
}

const addRole = {
  tags: ['roles'],  
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
  tags: ['roles'],  
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
  tags: ['roles'],  
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
