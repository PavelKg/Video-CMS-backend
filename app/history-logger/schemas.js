'use strict'

const queryStringJsonSchema = {
  sort: {description: 'Fields sorting', type: 'string'},
  limit: {type: 'integer'},
  offset: {type: 'integer'},
  filter: {type: 'string'}
}

const historyInfoObject = {
  type: 'object',
  properties: {
    mid: {type: 'integer'},
    created_at: {type: 'string'}
  }
}

const getHistoryInfo = {
  tags: ['historyInfo'],
  params: {
    type: 'object',
    properties: {
      cid: {
        type: 'string',
        pattern: '^[0-9]?'
      },
      uid: {
        type: 'string'
      }
    },
    additionalProperties: false
  },
  querystring: queryStringJsonSchema,
  response: {
    200: {
      type: 'array',
      items: historyInfoObject
    }
  }
}
