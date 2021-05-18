'use strict'

const shemasTags = ['tests']

const uuidObj = {
  type: 'string',
  pattern:
    '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
}

const queryStringJsonSchema = {
  sort: {description: 'Fields sorting', type: 'string'},
  limit: {type: 'integer'},
  offset: {type: 'integer'},
  filter: {type: 'string'}
}

const testThumbnail = {
  type: 'string'
}

const testObject = {
  type: 'object',
  properties: {
    uuid: uuidObj,
    cid: {type: 'integer'},
    created_at: {type: 'string'},
    updated_at: {type: 'string'},
    deleted_at: {type: ['string', 'null']},
    title: {type: 'string'},
    tags: {type: 'string'},
    description: {type: 'string'},
    is_public: {type: 'boolean'},
    thumbnail: testThumbnail,
    groups: {type: 'array', items: {type: 'integer'}},
    series: {type: 'array', items: {type: 'integer'}}
  }
}

const testObjectShort = {
  type: 'object',
  properties: {
    uuid: uuidObj,
    cid: {type: 'integer'},
    created_at: {type: 'string'},
    updated_at: {type: 'string'},
    deleted_at: {type: ['string', 'null']},
    title: {type: 'string'},
    description: {type: 'string'},
    is_public: {type: 'boolean'},
    thumbnail: testThumbnail,
    groups: {type: 'array', items: {type: 'integer'}},
    series: {type: 'array', items: {type: 'integer'}}
  },
  additionalProperties: false,
  required: ['uuid']
}

const testContent = {
  type: 'object',
  properties: {
    
  }
}

// const getCourseSectionsModel = {
//   tags: shemasTags,
//   params: {
//     type: 'object',
//     required: ['cid', 'crid'],
//     properties: {
//       cid: {
//         type: 'integer'
//       },
//       crid: {
//         type: 'integer'
//       }
//     },
//     additionalProperties: false
//   }
// }

const getTests = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: [],
    properties: {},
    additionalProperties: false
  },
  querystring: queryStringJsonSchema,
  response: {
    200: {
      type: 'array',
      items: testObjectShort
    }
  }
}

const getTestById = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: uuidObj
    },
    additionalProperties: false
  },
  response: {
    200: testObject
  }
}

const getTestContent = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: uuidObj
    },
    additionalProperties: false
  },
  response: {
    200: testContent
  }
}

const addTest = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: [],
    properties: {},
    additionalProperties: false
  },
  body: {...testObjectShort, required: ['uuid']}
}

const updTest = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: uuidObj
    },
    additionalProperties: false
  },
  body: testObjectShort
}

const updTestContent = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: uuidObj
    },
    additionalProperties: false
  },
  body: testContent
}

const delTest = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: uuidObj
    },
    additionalProperties: false
  }
}

module.exports = {
  getTests,
  getTestById,
  addTest,
  updTest,
  updTestContent,
  delTest
}
