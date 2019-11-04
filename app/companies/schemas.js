const setCommentsBoxVisibleState = {
  tags: ['companies'],
  params: {
    type: 'object',
    required: ['cid', 'state'],
    properties: {
      cid: {
        type: 'number'
      },
      state: {
        type: 'string',
        enum: ['display', 'hide']
      }
    },
    additionalProperties: false
  }
}

const getCommentsBoxVisibleState = {
  tags: ['companies'],
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
  response: {
    200: {
      type: 'object',
      properties: {
        visible: {
          type: 'boolean'
        }
      }
    }
  }
}

const updCompanyLogo = {
  tags: ['companies'],
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
  body: {
    type: 'object',
    properties: {
      data: {type: 'string'}
    },
    additionalProperties: false
  }
}

const getCompanyLogo = {
  tags: ['companies'],
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
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'string'
        }
      }
    }
  }
}

module.exports = {
  getCommentsBoxVisibleState,
  setCommentsBoxVisibleState,
  getCompanyLogo,
  updCompanyLogo
}
