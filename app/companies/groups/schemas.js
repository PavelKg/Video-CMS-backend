'use strict'

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
      items: groupObject
    }
  }
}

const addGroup = {
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
