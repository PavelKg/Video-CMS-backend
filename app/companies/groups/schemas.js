'use strict'

const queryStringJsonSchema = {
  sort: {description: 'Fields sorting', type: 'string'},
  limit: {type: 'integer'},
  offset: {type: 'integer'},
  filter: {type: 'string'}
}

const groupObject = {
  type: 'object',
  properties: {
    gid: {type: 'integer'},
    cid: {type: 'integer'},
    name: {type: 'string'},
    parent: {type: ['integer', 'null']},
    group_series: {type: 'array', items: {type: 'integer'}},
    deleted_at: {type: 'string'}
  }
}

const groupBindingObject = {
  type: 'object',
  properties: {
    gid: {type: 'integer'},
    cid: {type: 'integer'},
    name: {type: 'string'},
    binded: {type: 'boolean'},
    deleted_at: {type: 'string'}
  }
}

const group = {
  type: 'object',
  properties: {
    name: {type: 'string', minLength: 3, maxLength: 20},
    parent: {type: ['number', 'null']},
    group_series: {type: 'array', items: {type: 'integer'}}
  },
  required: ['name', 'group_series'],
  additionalProperties: false
}

const getCompanyGroups = {
  tags: ['groups'],
  params: {
    type: 'object',
    required: ['cid'],
    properties: {
      cid: {
        type: 'integer',
        pattern: '^[0-9]?'
      }
    },
    additionalProperties: false
  },
  querystring: queryStringJsonSchema,
  response: {
    200: {
      type: 'array',
      items: groupObject
    }
  }
}

const getCompanyGroupById = {
  tags: ['groups'],
  params: {
    type: 'object',
    required: ['cid', 'gid'],
    properties: {
      cid: {
        type: 'integer'
      },
      gid: {
        type: 'integer'
      }
    },
    additionalProperties: false
  },
  querystring: queryStringJsonSchema,
  response: {
    200: groupObject
  }
}

const getGroupsBindingSeries = {
  tags: ['groups'],
  params: {
    type: 'object',
    required: ['cid', 'sid'],
    properties: {
      cid: {
        type: 'integer'
      },
      sid: {
        type: 'integer'
      }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'array',
      items: groupBindingObject
    }
  }
}

const addGroup = {
  tags: ['groups'],
  params: {
    type: 'object',
    required: ['cid'],
    properties: {
      cid: {
        type: 'integer',
        pattern: '^[0-9]?'
      }
    },
    additionalProperties: false
  },
  body: group
}

const updGroup = {
  tags: ['groups'],
  params: {
    type: 'object',
    required: ['cid', 'gid'],
    properties: {
      cid: {
        type: 'integer',
        pattern: '^[0-9]?'
      },
      gid: {type: 'integer', pattern: '^[0-9]?'}
    },
    additionalProperties: false
  },
  body: group
}

const delGroup = {
  tags: ['groups'],
  params: {
    type: 'object',
    required: ['cid', 'gid'],
    properties: {
      cid: {
        type: 'integer',
        pattern: '^[0-9]?'
      },
      gid: {type: 'integer'}
    },
    additionalProperties: false
  }
}

const delGroupSeries = {
  tags: ['groups'],
  params: {
    type: 'object',
    required: ['cid', 'gid', 'sid'],
    properties: {
      cid: {
        type: 'integer',
        pattern: '^[0-9]?'
      },
      gid: {type: 'integer'},
      sid: {type: 'integer'}
    },
    additionalProperties: false
  }
}

module.exports = {
  getCompanyGroups,
  getCompanyGroupById,
  addGroup,
  updGroup,
  delGroup,
  delGroupSeries,
  getGroupsBindingSeries
}
