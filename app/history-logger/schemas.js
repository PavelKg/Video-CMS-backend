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
    uid: {type: 'string'},
    category: {type: 'string'},
    action: {type: 'string'},
    object: {type: 'string'},
    result: {type: 'string'},
    created_at: {type: 'string'}
  }
}

const historyInfo = {
  tags: ['history'],
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

const historyCategories = {
  tags: ['history'],
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
    200: {type: 'array', items: {type: 'string'}}
  }
}

const historyCategoryObjects = {
  tags: ['history'],
  querystring: {
    type: 'object',
    properties: {
      ...queryStringJsonSchema,
      categories: {type: 'string'}
    },
    required: ['categories']
  },
  response: {
    200: {type: 'array', items: {type: 'string'}}
  }
}

const historyCategoryObjectsByName = {
  tags: ['history'],
  params: {
    type: 'object',
    properties: {
      cname: {
        type: 'string'
      }
    },
    additionalProperties: false
  },
  querystring: queryStringJsonSchema,
  response: {
    200: {type: 'array', items: {type: 'string'}}
  }
}

module.exports = {
  historyInfo,
  historyCategories,
  historyCategoryObjects,
  historyCategoryObjectsByName

}
