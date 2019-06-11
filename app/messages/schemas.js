'use strict'

const queryStringJsonSchema = {
  sort: {description: 'Fields sorting', type: 'string'},
  limit: {type: 'integer'},
  offset: {type: 'integer'},
  filter: {type: 'string'}
}

const messageObject = {
  type: 'object',
  properties: {
    mid: {type: 'integer'},
    sender_uid: {type: 'string'},
    sender_cid: {type: 'string'},
    sender_cname: {type: 'string'},
    receiver_uid: {type: 'string'},
    receiver_cid: {type: 'string'},
    receiver_cname: {type: 'string'},
    subject: {type: 'string'},
    text: {type: 'string'},
    starred: {type: 'boolean'},
    created_at: {type: 'string'},
    deleted_at: {type: 'string'}
  }
}

const message = {
  type: 'object',
  properties: {
    receiver_cid: {type: 'string'},
    receiver_uid: {type: 'string'},
    subject: {type: 'string'},
    text: {type: 'string'},
    starred: {type: 'boolean'}
  },
  required: ['receiver_cid', 'receiver_uid', 'subject', 'text']
}

const getUserMessages = {
  tags: ['messages'],
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
      items: messageObject
    }
  }
}

const getMessagesReceivers = {
  tags: ['messages'],
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
      items: {
        type: 'object',
        properties: {
          uid: {type: 'string'},
          cid: {type: 'string'}
        }
      }
    }
  }
}

const addMessage = {
  tags: ['messages'],
  params: {},
  body: message
}

const starMessage = {
  tags: ['messages'],
  params: {
    type: 'object',
    required: ['mid'],
    properties: {
      mid: {
        type: 'string',
        pattern: '^[0-9]?'
      }
    },
    additionalProperties: false
  }
}

const delMessage = {
  tags: ['messages'],
  params: {
    type: 'object',
    required: ['mid'],
    properties: {
      mid: {
        type: 'string',
        pattern: '^[0-9]?'
      }
    },
    additionalProperties: false
  }
}

module.exports = {
  getUserMessages,
  getMessagesReceivers,
  addMessage,
  delMessage,
  starMessage
}
