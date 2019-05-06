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
    gid: {type: 'string'},
    name: {type: 'string'},
    deleted_at: {type: 'string'}
  }
}

const group = {
  type: 'object',
  properties: {
    gid: {type: 'string'},
    name: {type: 'string'}
  },
  required: ['gid', 'name'],
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
      gid: {type: 'string'}
    },
    additionalProperties: false
  },
  body: {
    type: 'object',
    properties: {
      name: {type: 'string'}
    },
    required: ['name']
  }
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
      gid: {type: 'string'}
    },
    additionalProperties: false
  }
}

module.exports = {
  getCompanyGroups,
  addGroup,
  updGroup,
  delGroup
}
