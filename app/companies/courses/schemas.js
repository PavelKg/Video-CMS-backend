'use strict'

//const courses = require('.')
const shemasTags = ['courses']

const uuidObj = {
  type: 'string',
  pattern:
    '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
}

const course_name = {type: 'string', pattern: '^[\\d\\w-]+$'}

const queryStringJsonSchema = {
  sort: {description: 'Fields sorting', type: 'string'},
  limit: {type: 'integer'},
  offset: {type: 'integer'},
  filter: {type: 'string'}
}

const courseObject = {
  type: 'object',
  properties: {
    cid: {type: 'integer'},
    name: course_name,
    title: {type: 'string'},
    is_published: {type: 'boolean'},
    details: {type: 'string'},
    created_at: {type: ['string', 'null']},
    updated_at: {type: 'string'},
    deleted_at: {type: 'string'},
    tags: {type: 'string'},
    teachers: {type: 'array', items: {type: 'string'}}
  }
}

const course = {
  type: 'object',
  properties: {
    name: course_name,
    title: {type: 'string'},
    tags: {type: 'string'},
    teachers: {type: 'array', items: {type: 'integer'}},
    details: {type: 'string'},
    is_published: {type: 'boolean'}
  },
  required: ['name'],
  additionalProperties: false
}

const courseSection = {
  type: 'object',
  properties: {
    name: course_name,
    title: {type: 'string'},
    description: {type: 'string'},
    uuid: uuidObj,
    modules_length: {type: 'integer'}
  },

  additionalProperties: false
}

const getCourseSections = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['name'],
    properties: {
      name: course_name
    },
    additionalProperties: false
  },
  //querystring: queryStringJsonSchema,
  response: {
    200: {
      type: 'array',
      items: courseSection
    }
  }
}

const updCourseSections = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['name'],
    properties: {
      name: course_name
    },

    additionalProperties: false
  },
  body: {
    type: 'object',
    required: ['act', 'secid'],
    properties: {
      secid: uuidObj,
      act: {type: 'string', enum: ['up', 'down', 'del', 'add']}
    }
  },
  response: {
    200: {
      type: 'array',
      items: courseSection
    }
  }
}

const getCourses = {
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
      items: courseObject
    }
  }
}

const getCourseById = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['name'],
    properties: {
      name: course_name
    },
    additionalProperties: false
  },
  querystring: queryStringJsonSchema,
  response: {
    200: courseObject
  }
}

const addCourse = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: [],
    properties: {},
    additionalProperties: false
  },
  body: course
}

const updCourse = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['name'],
    properties: {
      name: course_name
    },
    additionalProperties: false
  },
  body: course
}

const delCourse = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['name'],
    properties: {
      name: course_name
    },
    additionalProperties: false
  }
}

module.exports = {
  getCourses,
  getCourseById,
  getCourseSections,
  updCourseSections,
  addCourse,
  updCourse,
  delCourse
}
