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

const coursesSectionObject = {
  type: 'object',
  properties: {
    secid: {type: 'integer'},
    cid: {type: 'integer'},
    title: {type: 'string'},
    tags: {type: 'array', items: {type: 'string'}},
    description: {type: 'string'},
    modules: {type: 'array', items: {type: 'string'}},
    created_at: {type: ['string', 'null']},
    updated_at: {type: 'string'},
    deleted_at: {type: 'string'},
    uuid:  uuidObj
  }
}

const coursesSectionsShort = {
  type: 'object',
  properties: {
    title: {type: 'string'},
    tags: {type: 'array', items: {type: 'string'}},
    description: {type: 'string'},
  },
  required: ['title'],
  additionalProperties: false
}

const getCoursesSections = {
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
  querystring: queryStringJsonSchema,
  response: {
    200: {
      type: 'array',
      items: coursesSectionObject
    }
  }
}

const getCoursesSectionById = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['cid', 'secid'],
    properties: {
      cid: {
        type: 'integer'
      },
      secid: {
        type: 'integer'
      }
    },
    additionalProperties: false
  },
  querystring: queryStringJsonSchema,
  response: {
    200: coursesSectionObject
  }
}

const addCoursesSection = {
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
  body: coursesSectionsShort
}

const updCoursesSection = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['cid', 'secid'],
    properties: {
      cid: {
        type: 'integer'
      },
      secid: {type: 'integer'}
    },
    additionalProperties: false
  },
  body: coursesSectionsShort
}

const delCoursesSection = {
  tags: shemasTags,
  params: {
    type: 'object',
    required: ['cid', 'secid'],
    properties: {
      cid: {
        type: 'integer'
      },
      secid: {type: 'integer'}
    },
    additionalProperties: false
  }
}

module.exports = {
  getCoursesSections,
  getCoursesSectionById,
  addCoursesSection,
  updCoursesSection,
  delCoursesSection
}
