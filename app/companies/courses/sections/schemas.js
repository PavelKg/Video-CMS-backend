'use strict'

const courses = require('.')

const queryStringJsonSchema = {
  sort: {description: 'Fields sorting', type: 'string'},
  limit: {type: 'integer'},
  offset: {type: 'integer'},
  filter: {type: 'string'}
}

const courseObject = {
  type: 'object',
  properties: {
    crid: {type: 'integer'},
    cid: {type: 'integer'},
    name: {type: 'string'},
    published: {type: 'boolean'},
    created_at: {type: ['string', 'null']},
    updated_at: {type: 'string'},
    deleted_at: {type: 'string'},
    tags: {type: 'array', items: {type: 'string'}},
    teachers: {type: 'array', items: {type: 'string'}}
  }
}

const course = {
  type: 'object',
  properties: {
    name: {type: 'string', minLength: 3, maxLength: 20},
    tags: {type: 'array', items: {type: 'string'}},
    teachers: {type: 'array', items: {type: 'integer'}}
  },
  required: ['name'],
  additionalProperties: false
}

const getCompanyCourses = {
  tags: ['courses'],
  params: {
    type: 'object',
    required: ['cid'],
    properties: {
      cid: {
        type: 'integer'
      }
    },
    additionalProperties: false
  },
  querystring: queryStringJsonSchema,
  response: {
    200: {
      type: 'array',
      items: courseObject
    }
  }
}

const getCompanyCourseById = {
  tags: ['courses'],
  params: {
    type: 'object',
    required: ['cid', 'crid'],
    properties: {
      cid: {
        type: 'integer'
      },
      crid: {
        type: 'integer'
      }
    },
    additionalProperties: false
  },
  querystring: queryStringJsonSchema,
  response: {
    200: courseObject
  }
}

const addCourse = {
  tags: ['courses'],
  params: {
    type: 'object',
    required: ['cid'],
    properties: {
      cid: {
        type: 'integer'
      }
    },
    additionalProperties: false
  },
  body: course
}

const updCourse = {
  tags: ['courses'],
  params: {
    type: 'object',
    required: ['cid', 'crid'],
    properties: {
      cid: {
        type: 'integer'
      },
      crid: {type: 'integer'}
    },
    additionalProperties: false
  },
  body: course
}

const delCourse = {
  tags: ['courses'],
  params: {
    type: 'object',
    required: ['cid', 'crid'],
    properties: {
      cid: {
        type: 'integer'
      },
      crid: {type: 'integer'}
    },
    additionalProperties: false
  }
}

module.exports = {
  getCompanyCourses,
  getCompanyCourseById,
  addCourse,
  updCourse,
  delCourse
}
