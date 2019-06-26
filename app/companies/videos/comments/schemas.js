'use strict'

const queryStringJsonSchema = {
  sort: {description: 'Fields sorting', type: 'string'},
  limit: {type: 'integer'},
  offset: {type: 'integer'},
  filter: {type: 'string'}
}

const uuidObj = {
  type: 'string',
  pattern:
    '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
}

const videoCommentObject = {
  type: 'object',
  properties: {
    comment_video_uuid: uuidObj,
    comment_company_id: {type: 'number'},
    comment_id: {type: 'number'},
    comment_text: {type: 'string'},
    comment_visible: {type: 'boolean'},
    comment_user_uid: {type: 'string'},
    created_at: {type: 'string'},
    updated_at: {type: 'string'},
    deleted_at: {type: 'string'}
  }
}

const commentObject = {
  type: 'object',
  properties: {
    comment_text: {type: 'string'}
  },
  required: ['comment_text'],
  additionalProperties: false
}

const getComments = {
  tags: ['comments'],
  params: {
    type: 'object',
    required: ['cid', 'uuid'],
    properties: {
      cid: {
        type: 'number'
      },
      uuid: uuidObj
    },
    additionalProperties: false
  },
  querystring: queryStringJsonSchema,
  response: {
    200: {
      type: 'array',
      items: videoCommentObject
    }
  }
}

const addComment = {
  tags: ['comments'],
  params: {
    type: 'object',
    required: ['cid', 'uuid'],
    properties: {
      cid: {
        type: 'number'
      },
      uuid: uuidObj
    },
    additionalProperties: false
  },
  body: commentObject
}

const updCommentVisible = {
  tags: ['comments'],
  params: {
    type: 'object',
    required: ['cid', 'uuid', 'comid'],
    properties: {
      cid: {
        type: 'number',
      },
      uuid: uuidObj,
      comid:{type: 'number'}
    },
    additionalProperties: false
  },
  body: {
    type: 'object',
    properties: {
      value: {type: 'boolean'}
    },
    required: ['value']
  }
}

const delComment = {
  tags: ['comments'],
  params: {
    type: 'object',
    required: ['cid', 'uuid', 'comid'],
    properties: {
      cid: {
        type: 'number',
      },
      uuid: uuidObj,
      comid: {type: 'number'}
    },
    additionalProperties: false
  }
}

module.exports = {
  getComments,
  addComment,
  updCommentVisible,
  delComment
}
