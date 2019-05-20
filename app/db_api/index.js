'use strict'

const sortableColumns = {
  users: [
    'user_uid',
    'user_fullname',
    'role_rid',
    'group_gid',
    'user_email',
    'users.deleted_at'
  ],
  groups: ['group_gid', 'group_name', 'groups.deleted_at'],
  roles: ['role_rid', 'role_name', 'role_is_admin', 'roles.deleted_at'],
  messages: [
    'message_id',
    'message_impartant',
    'message_subject',
    'message_receiver',
    'message_sender',
    'messages.created_at'
  ]
}

const db_oper = {
  eq: '=',
  like: 'like'
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
  const filter_arr = _filter.split(',')
  const filter_str = filter_arr.map(function(item) {
    const re = /(.*)\[(\w+)\]:(.*)/i
    const parse_item = item.match(re)
    if (
      !sortableColumns[_table].includes(parse_item[1]) &&
      parse_item[1] !== '1'
    ) {
      throw new Error(`Invalid "filter" column - ${parse_item[1]}`)
    }
    return `${parse_item[1]} ${db_oper[parse_item[2]]} ${parse_item[3]}`
  })
  return ' AND ' + filter_str.join(' AND ')
}
module.exports = {sorting, filtration}
