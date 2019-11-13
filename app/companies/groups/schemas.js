'use strict'

const queryStringJsonSchema = {
  sort: {description: 'Fields sorting', type: 'string'},
  limit: {type: 'integer'},
  offset: {type: 'integer'},
  filter: {type: 'string'}
}

const groupObject = {
  type: 'object',
  properties: {
    gid: {type: 'integer'},
    cid: {type: 'string'},
    name: {type: 'string'},
    group_series: {type: 'array', items: {type: 'integer'}},
    deleted_at: {type: 'string'}
  }
}

const group = {
  type: 'object',
  properties: {
    name: {type: 'string'},
    group_series: {type: 'array', items: {type: 'integer'}},
  },
  required: ['name', 'group_series'],
  additionalProperties: false
}

const getCompanyGroups = {
  tags: ['groups'],
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
      items: groupObject
    }
  }
}

const getCompanyGroupById = {
  tags: ['groups'],
  params: {
    type: 'object',
    required: ['cid', 'gid'],
    properties: {
      cid: {
        type: 'number'
      },
      gid: {
        type: 'integer'
      }
    },
    additionalProperties: false
  },
  querystring: queryStringJsonSchema,
  response: {
    200: groupObject
  }
}

const addGroup = {
  tags: ['groups'],
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
  body: group
}

const updGroup = {
  tags: ['groups'],
  params: {
    type: 'object',
    required: ['cid', 'gid'],
    properties: {
      cid: {
        type: 'string',
        pattern: '^[0-9]?'
      },
      gid: {type: 'integer', pattern: '^[0-9]?'}
    },
    additionalProperties: false
  },
  body: group
}

const delGroup = {
  tags: ['groups'],
  params: {
    type: 'object',
    required: ['cid', 'gid'],
    properties: {
      cid: {
        type: 'string',
        pattern: '^[0-9]?'
      },
      gid: {type: 'integer'}
    },
    additionalProperties: false
  }
}

module.exports = {
  getCompanyGroups,
  getCompanyGroupById,
  addGroup,
  updGroup,
  delGroup
}
