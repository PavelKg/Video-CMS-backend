'use strict'

const queryStringJsonSchema = {
  sort: {description: 'Fields sorting', type: 'string'},
  limit: {type: 'integer'},
  offset: {type: 'integer'},
  filter: {type: 'string'}
}

const seriesObject = {
  type: 'object',
  properties: {
    sid: {type: 'integer'},
    cid: {type: 'integer'},
    name: {type: 'string'},
    is_private: {type: 'boolean'},
    description: {type: 'string'},
    tags: {type: 'string'},
    deleted_at: {type: 'string'},
    period_type: {
      type: ['string', 'null'],
      enum: [null, 'spec_period', 'user_reg']
    },
    activity_start: {type: ['string', 'null']},
    activity_finish: {type: ['string', 'null']}
  }
}

const series = {
  type: 'object',
  properties: {
    name: {type: 'string'},
    is_private: {type: 'boolean'},
    description: {type: 'string'},
    tags: {type: 'string'},
    period_type: {
      type: ['string', 'null'],
      enum: [null, 'spec_period', 'user_reg']
    },
    activity_start: {type: ['string', 'null']},
    activity_finish: {type: ['string', 'null']}
  },
  required: ['name'],
  additionalProperties: false
}

const getCompanySeries = {
  tags: ['series'],
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
      items: seriesObject
    }
  }
}

const getCompanySeriesById = {
  tags: ['series'],
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
  querystring: queryStringJsonSchema,
  response: {
    200: seriesObject
  }
}

const addSeries = {
  tags: ['series'],
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
  body: series
}

const updSeries = {
  tags: ['series'],
  params: {
    type: 'object',
    required: ['cid', 'sid'],
    properties: {
      cid: {
        type: 'integer'
      },
      sid: {type: 'integer', pattern: '^[0-9]?'}
    },
    additionalProperties: false
  },
  body: {
    type: 'object',
    properties: {
      name: {type: 'string'},
      description: {type: 'string'},
      tags: {type: 'string'},
      period_type: {
        type: ['string', 'null'],
        enum: [null, 'spec_period', 'user_reg']
      },
      activity_start: {type: ['string', 'null']},
      activity_finish: {type: ['string', 'null']}
    },
    required: ['name', 'period_type', 'activity_start', 'activity_finish']
  }
}

const delSeries = {
  tags: ['series'],
  params: {
    type: 'object',
    required: ['cid', 'sid'],
    properties: {
      cid: {
        type: 'integer'
      },
      sid: {type: 'integer'}
    },
    additionalProperties: false
  }
}

module.exports = {
  getCompanySeries,
  getCompanySeriesById,
  addSeries,
  updSeries,
  delSeries
}
