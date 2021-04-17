'use strict'

//const courses = require('.')

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

const courseObject = {
  type: 'object',
  properties: {
    crid: {type: 'integer'},
    cid: {type: 'integer'},
    name: {type: 'string'},
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
    name: {type: 'string', minLength: 3, maxLength: 20},
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
    title: {type: 'string'},
    description: {type: 'string'},
    uuid: uuidObj,
    modules_length: {type: 'integer'}
  },
  required: ['title'],
  additionalProperties: false
}

const getCourseSections = {
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
  //querystring: queryStringJsonSchema,
  response: {
    200: {
      type: 'array',
      items: courseSection
    }
  }
}

const updCourseSections = {
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
  getCourseSections,
  updCourseSections,
  addCourse,
  updCourse,
  delCourse
}
