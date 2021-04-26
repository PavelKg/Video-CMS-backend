'use strict'

const shemasTags = ['courses', 'courses-modules']

const uuidObj = {
  type: 'string',
  pattern:
    '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
}

const lessonObject = {
  type: 'array',
  items: {type: 'object', properties: {title: {type: 'string'}, tasks: {}}}
}

const courseModuleObject = {
  type: 'object',
  properties: {
    cid: {type: 'integer'},
    instructor_note: {},
    modid: uuidObj,
    lessons: lessonObject,
    created_at: {type: 'string'},
    updated_at: {type: 'string'},
    deleted_at: {type: ['string', 'null']}
  }
}

const courseModuleShort = {
  type: 'object',
  properties: {
    cid: {type: 'integer'},
    instructor_note: {}
  },
  additionalProperties: false
}

const getCourseModules = {
  tags: shemasTags,
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
  response: {
    200: {
      type: 'array',
      items: courseModuleObject
    }
  }
}

const getCourseModuleById = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['cid', 'modid'],
    properties: {
      cid: {
        type: 'integer'
      },
      modid: uuidObj
    },
    additionalProperties: false
  },
  response: {
    200: courseModuleObject
  }
}

const getCourseModuleLessons = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['cid', 'modid'],
    properties: {
      cid: {
        type: 'integer'
      },
      modid: uuidObj
    },
    additionalProperties: false
  },
  response: {
    200: lessonObject
  }
}

const updCourseModuleLessons = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['cid', 'modid'],
    properties: {
      cid: {
        type: 'integer'
      },
      modid: uuidObj
    },
    additionalProperties: false
  },
  body: {type: 'object', properties: {lessons: lessonObject}}
}

const addCourseModule = {
  tags: shemasTags,
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
  body: courseModuleShort
}

const updCourseModule = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['cid', 'modid'],
    properties: {
      cid: {
        type: 'integer'
      },
      modid: uuidObj
    },
    additionalProperties: false
  },
  body: courseModuleShort
}

const delCourseModule = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['cid', 'modid'],
    properties: {
      cid: {
        type: 'integer'
      },
      modid: uuidObj
    },
    additionalProperties: false
  }
}

module.exports = {
  getCourseModules,
  getCourseModuleById,
  getCourseModuleLessons,
  updCourseModuleLessons,
  addCourseModule,
  updCourseModule,
  delCourseModule
}
