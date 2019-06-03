'use strict'

const uploadFileObject = {
  data: {
    type: 'object',
    properties: {
      name: {type: 'string'},
      size: {type: 'integer'},
      type: {type: 'string'}
    }
  }
}

const queryStringJsonSchema = {
  files: {
    description: 'Files list',
    type: 'array',
    items: uploadFileObject
  }
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
      type: 'array',
      items: {type: 'string'}
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
