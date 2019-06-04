'use strict'

const queryStringJsonSchema = {
  name: {type: 'string'},
  size: {type: 'integer'},
  type: {type: 'string'}
}

const gcsUploadSignedUrl = {
  tags: ['videos'],
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
      type: 'object',
      properties: {
        name: {
          type: 'string'
        },
        url: {
          type: 'string'
        }
      }
    }
  }
}

const gcsUploadSignedPolicy = {
  tags: ['videos'],
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
  response: {
    200: {
      type: 'object',
      properties: {
        url: {type: 'string'}
      }
    }
  }
}

module.exports = {
  gcsUploadSignedUrl,
  gcsUploadSignedPolicy
}
