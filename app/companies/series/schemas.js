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
    cid: {type: 'string'},
    name: {type: 'string'},
    deleted_at: {type: 'string'}
  }
}

const series = {
  type: 'object',
  properties: {
    name: {type: 'string'},
    period_type: {type: 'string'},
    activity_start: {type: 'string'},
    activity_finish: {type: 'string'}
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
        type: 'string',
        pattern: '^[0-9]?'
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
        type: 'number'
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
        type: 'string',
        pattern: '^[0-9]?'
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
        type: 'string',
        pattern: '^[0-9]?'
      },
      sid: {type: 'integer', pattern: '^[0-9]?'}
    },
    additionalProperties: false
  },
  body: {
    type: 'object',
    properties: {
      name: {type: 'string'},
      period_type: {type: 'string'},
      activity_start: {type: 'string'},
      activity_finish: {type: 'string'}
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
        type: 'string',
        pattern: '^[0-9]?'
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
