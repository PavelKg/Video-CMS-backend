'use strict'

const queryStringJsonSchema = {
  sort: {description: 'Fields sorting', type: 'string'},
  limit: {type: 'integer'},
  offset: {type: 'integer'},
  filter: {type: 'string'}
}

const gcsQueryStringJsonSchema = {
  name: {type: 'string'},
  size: {type: 'integer'},
  type: {type: 'string'},
  uuid: {type: 'string'}
}

const uuidObj = {
  type: 'string',
  pattern:
    '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
}

const videoCatalogObject = {
  type: 'object',
  properties: {
    video_id: {type: 'string'},
    video_uuid: {type: 'string'},
    video_filename: {type: 'string'},
    video_status: {type: 'string'},
    video_thumbnail: {type: 'string'},
    video_title: {type: 'string'},
    video_tag: {type: 'string'},
    video_description: {type: 'string'},
    video_public: {type: 'boolean'},
    video_output_file: {type: 'string'},
    video_groups: {type: 'array', items: {type: 'integer'}},
    commentbox_visible: {type: 'boolean'},    
    created_at: {type: 'string'},
    updated_at: {type: 'string'},
    deleted_at: {type: 'string'}
  }
}

const videoCatalogThumbnailObject = {
  type: 'object',
  properties: {
    video_uuid: {type: 'string'},
    video_thumbnail: {type: 'string'}
  }
}

const gcsUploadSignedUrl = {
  tags: ['videos'],
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

const getVideosCatalog = {
  tags: ['videos'],
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
      items: videoCatalogObject
    }
  }
}

const getVideo = {
  tags: ['videos'],
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
    200: videoCatalogObject
  }
}

const getVideoThumbnail = {
  tags: ['videos'],
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
    200: videoCatalogThumbnailObject
  }
}

const delVideo = {
  tags: ['videos'],
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

const updVideo = {
  tags: ['videos'],
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
      video_thumbnail: {type: 'string'},
      video_title: {type: 'string'},
      video_tag: {type: 'string'},
      video_groups: {type: 'array', items: {type: 'integer'}},
      video_description: {type: 'string'},
      video_public: {type: 'boolean'}
    },
    //removeAdditonal: true, // added in an attempt to make this work
    additionalProperties: false // added in an attempt to make this work
  }
}

const updVideoStatus = {
  tags: ['videos'],
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

const updVideoPublicStatus = {
  tags: ['videos'],
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

const addVideoPlayerEvent = {
  tags: ['videos'],
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
    200: videoCatalogThumbnailObject
  }
}

// const gcsUploadSignedPolicy = {
//   tags: ['videos'],
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
  getVideosCatalog,
  getVideo,
  getVideoThumbnail,
  delVideo,
  updVideo,
  updVideoStatus,
  updVideoPublicStatus,
  addVideoPlayerEvent
  //gcsUploadSignedPolicy
}
