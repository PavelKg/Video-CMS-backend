'use strict'

const shemasTags = ['courses-section']

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

const courseSectionObject = {
  type: 'object',
  properties: {
    cid: {type: 'integer'},
    title: {type: 'string'},
    tags: {type: 'string'},
    description: {type: 'string'},
    uuid: uuidObj,
    modules: {type: 'array', items: {type: 'string'}}
  }
}

const courseSectionsShort = {
  type: 'object',
  properties: {
    title: {type: 'string'},
    description: {type: 'string'},
    tags: {type: 'string'},
    uuid: uuidObj
  },
  required: ['title'],
  additionalProperties: false
}

const sectionModule = {
  type: 'object',
  properties: {
    instructor_note: {},
    lessons_length: {type: 'integer'},
    modid: uuidObj
  }
}

const getCourseSectionsModel = {
  tags: shemasTags,
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
  }
}
const getCourseSections = {
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
      items: courseSectionObject
    }
  }
}

const getCourseSectionById = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['cid', 'uuid'],
    properties: {
      cid: {
        type: 'integer'
      },
      uuid: uuidObj
    },
    additionalProperties: false
  },
  response: {
    200: courseSectionObject
  }
}

const getSectionModules = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['cid', 'uuid'],
    properties: {
      cid: {
        type: 'integer'
      },
      uuid: uuidObj
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'array',
      items: sectionModule
    }
  }
}

const addCourseSection = {
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
  body: courseSectionsShort
}

const updCourseSection = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['cid', 'uuid'],
    properties: {
      cid: {
        type: 'integer'
      },
      uuid: uuidObj
    },
    additionalProperties: false
  },
  body: courseSectionsShort
}

const updSectionModules = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['cid', 'uuid'],
    properties: {
      cid: {
        type: 'integer'
      },
      uuid: uuidObj
    },

    additionalProperties: false
  },
  body: {
    type: 'object',
    required: ['act', 'modid'],
    properties: {
      modid: uuidObj,
      act: {type: 'string', enum: ['up', 'down', 'del', 'add']}
    }
  },
  response: {
    200: {
      type: 'array',
      items: sectionModule
    }
  }
}

const delCourseSection = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['cid', 'uuid'],
    properties: {
      cid: {
        type: 'integer'
      },
      uuid: uuidObj
    },
    additionalProperties: false
  }
}

module.exports = {
  getCourseSections,
  getCourseSectionsModel,
  getCourseSectionById,
  getSectionModules,
  updSectionModules,
  addCourseSection,
  updCourseSection,
  delCourseSection
}
