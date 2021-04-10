'use strict'
const errors = require('../../errors')
const db_api = require('../../db_api')
//const crypto = require('crypto')
const {createHash, createHmac, randomBytes} = require('crypto')
const {SYSTEM_NAME, MAIL_USER, TELE_BOTS} = process.env

const {
  AMQP_QUEUE_TO_BOT: vcms_to_telegram = 'back-to-bot',
  AMQP_QUEUE_TO_BACK: telegram_to_vcms = 'bot-to-back'
} = process.env
//const telegram_to_vcms = AMQP_QUEUE_TO_BACK
//const vcms_to_telegram = AMQP_QUEUE_TO_BOT

//const mail_templ = require('./mail_templates')
//const db_api = require('../db_api')

function checkSignature({hash, ...data}, secret) {
  const checkString = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join('\n')
  const hmac = createHmac('sha256', secret).update(checkString).digest('hex')
  return hmac === hash
}

class TelegramService {
  constructor(db, nodemailer, amqpChannels, histLogger, fastify) {
    this.db = db
    this.nodemailer = nodemailer
    this.amqpProduceChannel = amqpChannels.amqpProduceChannel
    this.amqpConsumeChannel = amqpChannels.amqpConsumeChannel
    this.history_category = 'Telegram'
    this.histLogger = histLogger
    this.fastify = fastify
    this.init()
  }
  async init() {
    const amqpConsumeChannel = this.amqpConsumeChannel
    const amqpProduceChannel = this.amqpProduceChannel

    if (amqpProduceChannel) {
      amqpProduceChannel.assertQueue(vcms_to_telegram, {durable: true})
    }
    if (amqpConsumeChannel) {
      amqpConsumeChannel.assertQueue(telegram_to_vcms, {durable: true})
      amqpConsumeChannel.consume(telegram_to_vcms, (msg) => {
        this.amqpConsumer(msg)
      })
    }
  }

  async amqpProduce(msg) {
    const amqpProduceChannel = this.amqpProduceChannel
    amqpProduceChannel.sendToQueue(
      vcms_to_telegram,
      Buffer.from(JSON.stringify(msg))
    )
  }

  async vcmsUserByChatId({botname, chatId}) {
    const client = await this.db.connect()
    try {
      const {rows} = await client.query(
        `SELECT user_id, 
          user_uid AS uid, 
          user_company_id AS cid, 
          company_telegram_bot AS botname, 
          role_is_admin as is_admin 
        FROM users, companies, telegram_users, roles
         WHERE telegram_user_id=$1
           AND users.deleted_at IS NULL 
           AND user_company_id = company_id
           AND cms_user_id=user_id
           AND user_role_id=role_id`,
        [chatId]
      )

      if (rows.length > 0) {
        const autz = {
          user_id: rows[0].user_id,
          uid: rows[0].uid,
          company_id: rows[0].cid
          //is_admin: rows[0].is_admin
        }
        const cid = rows[0].cid
        const botname = rows[0].botname

        return {autz, cid, botname}
      } else {
        throw 'User not found'
      }
    } catch (error) {
      console.log(error)
    } finally {
      if (client) {
        client.release()
      }
    }
  }

  async amqpConsumer(msg) {
    try {
      const parsedMsg = JSON.parse(msg.content.toString())

      const {type, chatId, content} = parsedMsg

      switch (type) {
        case 'deeplink':
          await this.loginDeeplink({chatId, content})
          break
        case 'messenger_registr':
          await this.messengerRegistr({chatId, content})
        case 'get':
          await this.getSomeContent({chatId, content})
          break
        default:
          break
      }
      //await func({chatId, content})

      this.amqpConsumeChannel.ack(msg)
    } catch (err) {
    } finally {
    }
  }

  async getSomeContent(payload) {
    const {botname, chatId, content} = payload

    const {botname: bot_name, autz, cid} = await this.vcmsUserByChatId({
      botname,
      chatId
    })

    const query = {}
    const catalog = await this.fastify.videoService.videosCatalog({autz, query})

    const out_content = catalog.map((item) => {
      return `https://botkg.ga/player/${item.video_uuid}?a='tele'&val=${chatId}`
    })
    const message = {
      chatId,
      type: 'response',
      contentType: 'pg-list',
      content: out_content
    }

    this.amqpProduce(message)
  }

  async messengerRegistr(payload) {
    let client = undefined
    const {chatId, content} = payload
    const {first_name, last_name, username, email} = content

    let histData = {
      category: this.history_category,
      action: 'Auth-messenger-registration',
      result: false,
      user_id: null,
      user_uid: null,
      cid: null,
      object_name: chatId,
      details: `Failure`,
      target_data: {
        chatId,
        content
      }
    }

    try {
      client = await this.db.connect()
      const {rows} = await client.query(
        `SELECT user_id, user_uid AS uid, user_company_id AS cid, company_telegram_bot AS botname 
         FROM users, companies
          WHERE user_email=$1 
            AND users.deleted_at IS NULL 
            AND user_company_id = company_id;`,
        [email]
      )

      if (rows.length === 1) {
        const autz = {
          user_id: rows[0].user_id,
          uid: rows[0].uid,
          company_id: rows[0].cid
        }
        const cid = rows[0].cid
        const botname = rows[0].botname

        const deeplink = await this.deeplinkAuth({autz, cid, botname})
        const {botname: urlBotname, token} = deeplink

        await this.nodemailer.sendMail({
          from: MAIL_USER,
          to: email,
          subject: 'Telegram login URL',
          text: `Login URL: https://t.me/${urlBotname}?start=${token}`
        })
      } else {
        histData.details = `Failure: user email is empty`
      }
    } catch (error) {
      histData.details = error
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }
  async loginDeeplink(payload) {
    let client = undefined
    const {chatId, content} = payload
    const {first_name, last_name, username, token} = content
    let histData = {
      category: this.history_category,
      action: 'Auth-deeplink',
      result: false,
      user_id: null,
      user_uid: null,
      cid: null,
      object_name: chatId,
      details: `Failure`,
      target_data: {
        chatId,
        content
      }
    }
    try {
      client = await this.db.connect()
      const {rows} = await client.query(
        `WITH vcmsuser AS (
          SELECT tdl_user_uid, tdl_company_id 
           FROM telegram_deeplink
           WHERE tdl_token=$1 AND COALESCE(tdl_used, FALSE) = FALSE 
           AND (created_at + interval '1 minutes' * tdl_lifetime_min) > now()
         ), userdata AS (
          SELECT user_id, user_company_id 
          FROM users, vcmsuser 
          WHERE user_uid=tdl_user_uid AND user_company_id = tdl_company_id
         )
         
         INSERT INTO telegram_users (cms_user_id, telegram_user_id, telegram_username, 
            telegram_first_name, telegram_last_name, cms_company_id)
             SELECT user_id, $2, $3, $4, $5, user_company_id FROM userdata
             ON CONFLICT (cms_user_id) DO UPDATE SET telegram_user_id=$2, 
              telegram_username=$3, telegram_first_name=$4, telegram_last_name=$5 
          RETURNING cms_user_id, cms_company_id;`,
        [token, chatId, username, first_name, last_name]
      )

      await client.query(
        `UPDATE telegram_deeplink SET tdl_used=true WHERE tdl_token=$1;`,
        [token]
      )

      if (rows.length > 0) {
        histData.result = rows.length > 0
        histData.user_id = rows[0].cms_user_id
        //histData.user_uid = rows[0].cms_company_id
        histData.cid = rows[0].cms_company_id
        histData.details = 'Success'

        this.amqpProduce({
          bot_name: '',
          chatId: chatId,
          type: 'welcome',
          content: {first_name: first_name ? first_name : username}
        })
      }
    } catch (error) {
      throw Error(error)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async loginAuth(payload) {
    let client = undefined
    const {autz, cid, body: signature, botname} = payload
    const {uid, user_id, company_id} = autz
    let histData = {
      category: this.history_category,
      action: 'Auth-login',
      result: false,
      user_id: user_id,
      user_uid: uid,
      cid: company_id,
      object_name: uid,
      details: `Failure`,
      target_data: {
        ...signature
      }
    }

    try {
      client = await this.db.connect()
      const bots = JSON.parse(TELE_BOTS)
      const bot_token = bots[botname.toLowerCase()]
      const {
        id: user_id,
        first_name = null,
        last_name = null,
        username = null
      } = signature

      if (!bot_token) {
        histData.details = errors.BOT_NAME_IS_NOT_CORRECT
        throw Error(errors.BOT_NAME_IS_NOT_CORRECT)
      }

      const secret = createHash('sha256').update(bot_token).digest()
      const check = checkSignature(signature, secret)
      if (!check) {
        histData.details = errors.USER_SIGNATURE_IS_NOT_CORRECT
        throw Error(errors.USER_SIGNATURE_IS_NOT_CORRECT)
      }

      const {rowCount} = await client.query(
        `select cms_user_id 
          from telegram_users, users 
          where cms_user_id = user_id and user_uid=$2 and user_company_id=$1`,
        [cid, uid]
      )
      if (rowCount > 0) {
        histData.details = errors.USER_HAS_REGISTERED
        throw Error(errors.USER_HAS_REGISTERED)
      }

      const {rows} = await client.query(
        `WITH vcmsuser AS (
          SELECT user_id from users where user_company_id=$2 and user_uid=$1
        )
       
        INSERT INTO telegram_users 
        (cms_user_id, cms_company_id, telegram_user_id, telegram_username, telegram_first_name, telegram_last_name ) 
          select user_id, $2, $3, $4, $5, $6 from vcmsuser
          RETURNING cms_user_id`,
        [uid, cid, user_id, username, first_name, last_name]
      )
      this.amqpProduce({
        bot_name: botname,
        chatId: user_id,
        type: 'welcome',
        content: {first_name: first_name ? `${first_name}` : username}
      })

      histData.result = typeof rows[0] === 'object'
      histData.details = `Success []`
      return rows[0].cms_user_id
    } catch (error) {
      throw Error(error)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }

  async deeplinkAuth(payload) {
    let client = undefined
    const {autz, cid, botname} = payload
    const {uid, user_id, company_id} = autz
    let histData = {
      category: this.history_category,
      action: 'Deeplink-Auth',
      result: false,
      user_id: user_id,
      user_uid: uid,
      cid: company_id,
      object_name: uid,
      details: `Failure`,
      target_data: {
        botname
      }
    }

    try {
      client = await this.db.connect()
      const token = randomBytes(24).toString('hex')
      const lifeTimeDef = 600
      const {rowCount} = await client.query(
        `select cms_user_id 
          from telegram_users, users 
          where cms_user_id = user_id and user_uid=$2 and user_company_id=$1`,
        [cid, uid]
      )
      if (rowCount > 0) {
        histData.details = errors.USER_HAS_REGISTERED
        throw Error(errors.USER_HAS_REGISTERED)
      }

      const {rows} = await client.query(
        `WITH vcmsuser AS (
          SELECT user_id, user_email from users where user_company_id=$2 and user_uid=$1
        )
       
        INSERT INTO telegram_deeplink 
        (tdl_user_id, tdl_user_uid, tdl_company_id, tdl_user_mail, tdl_token, tdl_lifetime_min) 
          select user_id, $1, $2, user_email, $3, $4 from vcmsuser
          RETURNING tdl_user_id`,
        [uid, cid, token, lifeTimeDef]
      )

      if (rows.length === 0) {
        histData.details = errors.WRONG_USER_UID
        throw Error(errors.WRONG_USER_UID)
      }

      histData.result = typeof rows[0] === 'object'
      histData.details = `Success []`
      return {botname, token}
    } catch (error) {
      throw Error(error)
    } finally {
      if (client) {
        client.release()
      }
      this.histLogger.saveHistoryInfo(histData)
    }
  }
}

module.exports = TelegramService
