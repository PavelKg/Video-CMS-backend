'use strict'

const userObject = {
  type: 'object',
  properties: {
    uid: {type: 'string'},
    fullname: {type: 'string'},
    gid: {type: 'string'},
    rid: {type: 'string'},
    email: {type: 'string'},
    deleted_at: {type: 'string'}
  }
}

const user = {
  type: 'object',
  properties: {
    uid: {type: 'string'},
    fullname: {type: 'string'},
    gid: {type: 'string'},
    rid: {type: 'string'},
    email: {type: 'string'},
    password: {type: 'string'}
  },
  required: ['uid', 'fullname', 'gid', 'rid', 'email', 'password'],
  additionalProperties: false
}

const getCompanyUsers = {
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
      items: userObject
    }
  }
}

const getCompanyUserInfo = {
  params: {
    type: 'object',
    required: ['cid', 'uid'],
    properties: {
      cid: {
        type: 'string',
        pattern: '^[0-9]?'
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
  body: user
}

const updUser = {
  params: {
    type: 'object',
    required: ['cid', 'uid'],
    properties: {
      cid: {
        type: 'string',
        pattern: '^[0-9]?'
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
  params: {
    type: 'object',
    required: ['cid', 'uid'],
    properties: {
      cid: {
        type: 'string',
        pattern: '^[0-9]?'
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
