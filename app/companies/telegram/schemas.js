'use strict'

const queryStringJsonSchema = {
  sort: {description: 'Fields sorting', type: 'string'},
  limit: {type: 'integer'},
  offset: {type: 'integer'},
  filter: {type: 'string'}
}

const loginAuth = {
  tags: ['telegram'],
  params: {
    type: 'object',
    required: ['cid', 'botname'],
    properties: {
      cid: {
        type: 'integer'
      },
      botname: {type: 'string'}
    },
    additionalProperties: false
  },
  response: {
    201: {
      properties: {
        url: {type: 'string'}
      }
    }
  }
}

const deeplinkAuth = {
  tags: ['telegram'],
  params: {
    type: 'object',
    required: ['cid', 'botname'],
    properties: {
      cid: {
        type: 'integer'
      },
      botname: {type: 'string'}
    },
    additionalProperties: false
  },
  response: {
    200: {
      properties: {
        url: {type: 'string'}
      }
    }
  }
}

module.exports = {deeplinkAuth, loginAuth}
