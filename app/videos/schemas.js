'use strict'

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
  response: {
    200: {
      type: 'object',
      properties: {
        url: {type: 'string'}
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
