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

const gcsQueryStringJsonSchema = {
  type: 'object',
  required: ['name', 'size', 'type', 'uuid'],
  properties: {
    name: {type: 'string'},
    size: {type: 'integer'},
    type: {type: 'string'},
    uuid: uuidObj
  }
}

const fileCatalogObject = {
  type: 'object',
  properties: {
    file_id: {type: 'string'},
    file_uuid: {type: 'string'},
    file_filename: {type: 'string'},
    file_status: {type: 'string'},
    file_thumbnail: {type: 'string'},
    file_title: {type: 'string'},
    file_type:{type:'string'},
    file_tag: {type: 'string'},
    file_description: {type: 'string'},
    file_public: {type: 'boolean'},
    file_output_file: {type: 'string'},
    file_groups: {type: 'array', items: {type: 'integer'}},
    file_series: {type: 'array', items: {type: 'integer'}},
    commentbox_visible: {type: 'boolean'},
    created_at: {type: 'string'},
    updated_at: {type: 'string'},
    deleted_at: {type: 'string'}
  }
}

const fileCatalogThumbnailObject = {
  type: 'object',
  properties: {
    file_uuid: {type: 'string'},
    file_thumbnail: {type: 'string'}
  }
}

const gcsUploadSignedUrl = {
  tags: ['files'],
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

  querystring: gcsQueryStringJsonSchema,
  response: {
    200: {
      type: 'object',
      properties: {
        name: {
          type: 'string'
        },
        url: {
          type: 'string'
        },
        uuid: {
          type: 'string'
        }
      }
    }
  }
}

const getFilesCatalog = {
  tags: ['files'],
  params: {
    type: 'object',
    required: ['cid'],
    properties: {
      cid: {
        type: 'number'
      }
    },
    additionalProperties: false
  },
  querystring: queryStringJsonSchema,
  response: {
    200: {
      type: 'array',
      items: fileCatalogObject
    }
  }
}

const getFile = {
  tags: ['files'],
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
  response: {
    200: fileCatalogObject
  }
}

const getFileThumbnail = {
  tags: ['files'],
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
  response: {
    200: fileCatalogThumbnailObject
  }
}

const delFile = {
  tags: ['files'],
  params: {
    type: 'object',
    required: ['cid', 'uuid'],
    properties: {
      uuid: uuidObj,
      cid: {
        type: 'number'
      }
    },
    additionalProperties: false
  }
}

const delFileSeries = {
  tags: ['files'],
  params: {
    type: 'object',
    required: ['cid', 'uuid', 'sid'],
    properties: {
      uuid: uuidObj,
      cid: {
        type: 'integer'
      },
      sid: {
        type: 'integer'
      }
    },
    additionalProperties: false
  }
}

const delFileGroup = {
  tags: ['files'],
  params: {
    type: 'object',
    required: ['cid', 'uuid', 'gid'],
    properties: {
      uuid: uuidObj,
      cid: {
        type: 'integer'
      },
      gid: {
        type: 'integer'
      }
    },
    additionalProperties: false
  }
}

const updFile = {
  tags: ['files'],
  params: {
    type: 'object',
    required: ['cid', 'uuid'],
    properties: {
      cid: {type: 'number'},
      uuid: uuidObj
    },
    additionalProperties: false
  },
  body: {
    type: 'object',
    properties: {
      file_thumbnail: {type: 'string'},
      file_title: {type: 'string'},
      file_tag: {type: 'string'},
      file_groups: {type: 'array', items: {type: 'integer'}},
      file_series: {type: 'array', items: {type: 'integer'}},
      file_description: {type: 'string'},
      file_public: {type: 'boolean'}
    },
    //removeAdditonal: true, // added in an attempt to make this work
    additionalProperties: false // added in an attempt to make this work
  }
}

const updFileStatus = {
  tags: ['files'],
  params: {
    type: 'object',
    required: ['cid', 'uuid'],
    properties: {
      cid: {type: 'number'},
      uuid: uuidObj
    },
    additionalProperties: false
  },
  body: {
    type: 'object',
    properties: {
      value: {type: 'string'}
    },
    //removeAdditonal: true, // added in an attempt to make this work
    additionalProperties: false // added in an attempt to make this work
  }
}

const updFilePublicStatus = {
  tags: ['files'],
  params: {
    type: 'object',
    required: ['cid', 'uuid'],
    properties: {
      cid: {type: 'number'},
      uuid: uuidObj
    },
    additionalProperties: false
  },
  body: {
    type: 'object',
    properties: {
      value: {type: 'string'}
    },
    //removeAdditonal: true, // added in an attempt to make this work
    additionalProperties: false // added in an attempt to make this work
  }
}

const addFilePlayerEvent = {
  tags: ['files'],
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
  response: {
    200: fileCatalogThumbnailObject
  }
}

const getFileBindingSeries = {
  tags: ['files'],
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
  }
}
const getFileBindingGroup = {
  tags: ['files'],
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
  }
}
// const gcsUploadSignedPolicy = {
//   tags: ['files'],
//   params: {
//     type: 'object',
//     properties: {
//       cid: {
//         type: 'string',
//         pattern: '^[0-9]?'
//       },
//       uid: {
//         type: 'string'
//       }
//     },
//     additionalProperties: false
//   },
//   response: {
//     200: {
//       type: 'object',
//       properties: {
//         url: {type: 'string'}
//       }
//     }
//   }
// }

module.exports = {
  gcsUploadSignedUrl,
  getFilesCatalog,
  getFile,
  getFileThumbnail,
  delFile,
  updFile,
  updFileStatus,
  updFilePublicStatus,
  addFilePlayerEvent,
  delFileSeries,
  delFileGroup,
  getFileBindingSeries,
  getFileBindingGroup
  //gcsUploadSignedPolicy
}
