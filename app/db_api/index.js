'use strict'

const sortableColumns = {
  users: [
    'user_uid',
    'user_fullname',
    'role_rid',
    'user_groups',
    'user_email',
    'users.deleted_at'
  ],
  groups: ['group_gid', 'group_name', 'groups.deleted_at'],
  roles: ['role_rid', 'role_name', 'role_is_admin', 'roles.deleted_at'],
  messages: [
    'mid',
    'message_subject',
    'message_receiver',
    'message_sender',
    'vw_messages_outbox.created_at',
    'vw_messages_inbox.created_at',
    'vw_messages_outbox.updated_at',
    'vw_messages_inbox.updated_at'
  ],
  videos: [
    'video_thumbnail',
    'videos.created_at',
    'videos.deleted_at',
    'videos.updated_at',
    'video_uuid',
    'video_filename',
    'video_status',
    'video_title',
    'video_public',
    'video_tag',
    'video_description'
  ],
  comments: ['comments.created_at'],
  history: [
    'users_history_log.created_at',
    'userhist_action',
    'userhist_category',
    'userhist_user_uid',
    'userhist_object_name'
  ]
}

const db_oper = {
  eq: '= ',
  lt: '< ',
  gt: '> ',
  lte: '<= ',
  gte: '>= ',
  like: 'like',
  isNull: 'IS NULL',
  ol: ' && ' // array overlap
}

function sorting(_sort, _table) {
  const sort_arr = _sort.split(',')
  const sort_str = sort_arr.map(function(item) {
    const field = item.startsWith('-') ? `${item.substr(1)}` : `${item}`
    const order = item.startsWith('-') ? `DESC` : `ASC`
    if (!sortableColumns[_table].includes(field)) {
      throw new Error(`Invalid "sort" column - ${field}`)
    }
    return `${field} ${order}`
  })
  return sort_str.join(', ')
}

function filtration(_filter, _table) {
  const filter_arr = _filter.split(/(?<!\\),/)
  console.log('filter_arr=', _filter.match(/^\\((.*)\\)[ \\t]+\\((.*)\\)$/gi))
  const filter_str = filter_arr.map(function(item) {
    const re = /(.*)\[(\w+)\]:(.*)/i
    const parse_item = item.match(re)
    const sl = new RegExp(/\\/, 'g')
    if (
      !sortableColumns[_table].includes(parse_item[1]) &&
      parse_item[1] !== '1'
    ) {
      throw new Error(`Invalid "filter" column - ${parse_item[1]}`)
    }
    return `${
      parse_item[1]
    } ${db_oper[parse_item[2]] ? db_oper[parse_item[2]] : `${parse_item[2]}`} ${parse_item[3].replace(sl, '')}`
  })
  return ' AND ' + filter_str.join(' AND ')
}

function setFilterTz(filter, timezone) {
  let qFilter = filter
  const timeField = ['created_at', 'deleted_at', 'updated_at']

  timeField.forEach((elem, index) => {
    const re = new RegExp(elem, 'gi')
    qFilter = qFilter.replace(re, `${elem} AT TIME ZONE '${timezone}'`)
  })
  return qFilter
}

module.exports = {
  sorting,
  filtration,
  setFilterTz
}
