'use strict'
/** description */
const queryStringJsonSchema = {
  sort: {description: 'Fields sorting', type: 'string'},
  limit: {type: 'integer'},
  offset: {type: 'integer'},
  filter: {type: 'string'}
}

const userObject = {
  type: 'object',
  properties: {
    uid: {type: 'string'},
    fullname: {type: 'string'},
    cid: {type: 'string'},
    gid: {type: 'string'},
    group_name: {type: 'string'},
    rid: {type: 'string'},
    email: {type: 'string'},
    deleted_at: {type: 'string'},
    last_login: {type: 'string'}
  }
}

const user = {
  type: 'object',
  properties: {
    uid: {type: 'string'},
    fullname: {type: 'string'},
    cid: {type: 'string'},
    gid: {type: 'string'},
    rid: {type: 'string'},
    email: {type: 'string'},
    password: {type: 'string'}
  },
  required: ['uid', 'fullname', 'gid', 'rid', 'email', 'password'],
  additionalProperties: false
}

const getCompanyUsers = {
  tags: ['users'],
  params: {
    type: 'object',
    required: ['cid'],
    properties: {
      cid: {
        type: 'number',
      }
    },
    additionalProperties: false
  },
  querystring: queryStringJsonSchema,
  response: {
    200: {
      type: 'array',
      items: userObject
    }
  }
}

const getCompanyUserInfo = {
  tags: ['users'],
  params: {
    type: 'object',
    required: ['cid', 'uid'],
    properties: {
      cid: {
        type: 'number'
      },
      uid: {
        type: 'string',
        pattern: '^[0-9]?'
      }
    },
    additionalProperties: false
  },
  response: {
    200: userObject
  }
}

const addUser = {
  tags: ['users'],
  params: {
    type: 'object',
    required: ['cid'],
    properties: {
      cid: {
        type: 'number'
      }
    },
    additionalProperties: false
  },
  body: user
}

const updUser = {
  tags: ['users'],
  params: {
    type: 'object',
    required: ['cid', 'uid'],
    properties: {
      cid: {
        type: 'number'
      },
      uid: {type: 'string'}
    },
    additionalProperties: false
  },
  body: {
    type: 'object',
    properties: {
      fullname: {type: 'string'},
      gid: {type: 'string'},
      rid: {type: 'string'},
      email: {type: 'string'},
      password: {type: 'string'}
    },
    required: ['fullname', 'gid', 'rid', 'email']
  }
}

const delUser = {
  tags: ['users'],
  params: {
    type: 'object',
    required: ['cid', 'uid'],
    properties: {
      cid: {
        type: 'number'
      },
      uid: {type: 'string'}
    },
    additionalProperties: false
  }
}

module.exports = {
  getCompanyUsers,
  getCompanyUserInfo,
  addUser,
  updUser,
  delUser
}
