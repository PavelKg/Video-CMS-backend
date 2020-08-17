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
    cid: {type: 'integer'},
    name: {type: 'string'},
    is_admin: {type: 'boolean'},
    permits: {},
    deleted_at: {type: 'string'}
  }
}

const role = {
  type: 'object',
  properties: {
    rid: {type: 'string'},
    cid: {type: 'integer'},
    name: {type: 'string'},
    permits: {},
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
        type: 'integer'
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

const getCompanyRoleById = {
  tags: ['roles'],
  params: {
    type: 'object',
    required: ['cid', 'rid'],
    properties: {
      cid: {
        type: 'integer'
      },
      rid: {
        type: 'string'
      }
    },
    additionalProperties: false
  },
  querystring: queryStringJsonSchema,
  response: {
    200: roleObject
  }
}

const getFeatures = {
  tags: ['roles'],
  params: {
    type: 'object',
    required: ['cid'],
    properties: {
      cid: {
        type: 'integer'
      }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          order: {},
          caption: {type: 'string'},
          children: {}
        }
      }
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
        type: 'integer'
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
        type: 'integer'
      },
      rid: {type: 'string'}
    },
    additionalProperties: false
  },
  body: {
    type: 'object',
    properties: {
      name: {type: 'string'},
      is_admin: {type: 'boolean'},
      permits: {}
    },
    additionalProperties: false,
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
        type: 'integer'
      },
      rid: {type: 'string'}
    },
    additionalProperties: false
  }
}

module.exports = {
  getCompanyRoles,
  getCompanyRoleById,
  getFeatures,
  addRole,
  updRole,
  delRole
}
