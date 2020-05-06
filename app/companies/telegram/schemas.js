'use strict'

const queryStringJsonSchema = {
  sort: {description: 'Fields sorting', type: 'string'},
  limit: {type: 'integer'},
  offset: {type: 'integer'},
  filter: {type: 'string'}
}

const deeplinkAuth = {
  tags: ['roles'],
  params: {
    type: 'object',
    required: ['cid', 'botname'],
    properties: {
      cid: {
        type: 'number'
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

module.exports = {deeplinkAuth}
