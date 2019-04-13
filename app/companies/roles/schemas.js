'use strict'

const roleObject = {
  type: 'object',
  properties: {
    rid: { type: 'string' },
    name: { type: 'string' },
    is_admin: { type: 'boolean' },
    deleted_at: {type: 'string' }
  }
}


const getCompanyRoles = {
  params: {
    type: 'object',
    required: ['cid'] ,
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

// const getTweets = {
//   response: {
//     200: {
//       type: 'array',
//       items: tweetObject
//     }
//   }
// }

module.exports = {
  getCompanyRoles
}