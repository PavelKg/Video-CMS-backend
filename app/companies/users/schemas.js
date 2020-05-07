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
    gids: {type: 'array', items: {type: 'integer'}},
    groups_name: {type: 'array', items: {type: 'string'}},
    rid: {type: 'string'},
    email: {type: 'string'},
    deleted_at: {type: 'string'},
    last_login: {type: 'string'},
    activity_start: {type: 'string'},
    activity_finish: {type: 'string'}
  }
}

const user = {
  type: 'object',
  properties: {
    uid: {type: 'string', maxLength: 10, minLength: 3},
    fullname: {type: 'string'},
    cid: {type: 'string'},
    gids: {type: 'array', items: {type: 'integer'}},
    rid: {type: 'string'},
    email: {type: 'string'},
    password: {type: 'string'},
    activity_start: {type: 'string'},
    activity_finish: {type: 'string'}
  },
  required: [
    'uid',
    'fullname',
    'gids',
    'rid',
    'email',
    'password',
    'activity_start',
    'activity_finish'
  ],
  additionalProperties: false
}

const getCompanyUsers = {
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

const importUsers = {
  tags: ['users'],
  summary: 'upload file',
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
  body: {
    type: 'object',
    properties: {
      userlist: {type: 'object'}
    },
    required: ['userlist']
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
      fullname: {type: 'string', minLength: 3},
      gids: {type: 'array', items: {type: 'integer'}},
      rid: {type: 'string'},
      email: {type: 'string'},
      password: {type: 'string'}
    },
    required: [
      'fullname',
      'gids',
      'rid',
      'email',
      'activity_start',
      'activity_finish'
    ]
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
  importUsers,
  addUser,
  updUser,
  delUser
}
