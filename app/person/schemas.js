'use strict'

const userProfileOutput = {
  type: 'object',
  require: ['uid', 'username'],
  properties: {
    uid: {type: 'string'},
    role: {type: 'string'},
    email: {type: 'string'},
    company_id: {type: 'string'},
    company_name: {type: 'string'},
    irole: {type: 'string'},
    username: {type: 'string'},
    timezone: {type: 'string'}
  }
}

const registration = {
  // This jsonschema will be used for data validation
  tags: ['person'],
  body: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: {
        type: 'string'
      },
      password: {
        type: 'string'
      }
    },
    additionalProperties: false
  },
  response: {
    // The 200 body response is described
    // by the following schema
    200: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId: {type: 'string'}
      },
      additionalProperties: false
    }
  }
}

const login = {
  tags: ['person'],
  body: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: {
        type: 'string'
      },
      password: {
        type: 'string'
      }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      required: ['token'],
      properties: {
        token: {type: 'string'}
      },
      additionalProperties: false
    }
  }
}

const logout = {
  tags: ['person'],
  response: {
    200: {
      type: 'string',
      additionalProperties: false
    }
  }
}

const passwordResetRequest = {
  tags: ['person'],
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: {
        type: 'string'
      },
      locale: {
        type: 'string'
      }
    },
    additionalProperties: false
  },
  response: {
    202: {
      type: 'string',
      additionalProperties: false
    }
  }
}

const passwordUpdate = {
  tags: ['person'],
  body: {
    type: 'object',
    required: ['token', 'password'],
    properties: {
      token: {
        type: 'string'
      },
      password: {
        type: 'string'
      }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'string',
      additionalProperties: false
    }
  }
}

// const search = {
//   querystring: {
//     type: 'object',
//     require: [ 'search' ],
//     properties: {
//       search: { type: 'string' }
//     },
//     additionalProperties: false
//   },
//   response: {
//     200: {
//       type: 'array',
//       items: userProfileOutput
//     }
//   }
// }

const getProfile = {
  tags: ['person'],
  params: {
    type: 'object',
    //required: ['uid'],
    properties: {
      uid: {
        type: 'string',
        pattern: '^[0-9a-fA-F]{24}'
      }
    }
  },
  response: {
    200: userProfileOutput
  }
}

const companyInfo = {
  tags: ['person'],
  response: {
    200: {
      type: 'object',
      properties: {
        company_name: {type: 'string'},
        created_at: {type: 'string'}
      }
    }
  }
}

module.exports = {
  registration,
  login,
  logout,
  passwordResetRequest,
  passwordUpdate,
  getProfile,
  companyInfo
}
