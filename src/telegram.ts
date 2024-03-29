import moment from 'moment'
import Telebot from 'telebot'
import { URL } from 'url'
import AlertManager from './alertmanager'
import { humanizeDuration, spliceArray } from './utils'
import { logger } from './logger'

const pjson = require('../package.json')

export default class Telegram {
  private bot: Telebot

  constructor() {
    if (process.env.TELEGRAM_BOT_TOKEN) {
      this.bot = new Telebot(process.env.TELEGRAM_BOT_TOKEN)
    } else {
      logger.error('Please define the TELEGRAM_BOT_TOKEN environment variable')
      process.exit(1)
    }
  }

  private alertLink = (labelsOrMatchers: any) => {
    const am = new AlertManager()
    const alertURL: URL = new URL(am.getAlertmanagerURL())
    alertURL.searchParams.append('silenced', 'false')
    alertURL.searchParams.append('inhibited', 'false')
    alertURL.searchParams.append('active', 'true')
    let filter = ''
    Object.entries(labelsOrMatchers).forEach((key, value) => {
      filter += `${key}="${value}",`
    })
    filter = `{${filter.slice(0, -1)}}`
    alertURL.searchParams.append('filter', filter)
    logger.debug(alertURL)
    return `${alertURL.origin}/#/alerts${alertURL.search}`
  }

  private formatAlertMessage = (data: any) => {
    const msg: any = {}
    msg.message = ''
    msg.status = data.status
    msg.startsAt = data.alerts[0].startsAt
    msg.promLink = data.alerts[0].generatorURL
    msg.firingSince = humanizeDuration(new Date(msg.startsAt))
    msg.alertLink = this.alertLink(data.alerts[0].labels)

    switch (msg.status) {
      // These emojis could help 🌶🚨❗️📣📢🔔🔕🔥🔇🤫
      case 'firing':
        msg.message += '🔥 Firing 🔥\n\n'
        break
      case 'resolved':
        msg.message += '✅ Resolved ✅\n\n'
        break
      default:
        msg.message += '🚨 Alerting 🚨\n\n'
        break
    }

    const wantedKeys: string[] = ['alerts', 'commonAnnotations', 'externalURL']
    if (wantedKeys.every(key => Object.keys(data).includes(key))) {
      data.alerts
        .slice(0, 4)
        .forEach((alert: { labels: { alertname: any }; annotations: { description: any } }) => {
          msg.message += `Title: _${alert.labels.alertname}_\n`
          msg.message += `Description: \`${alert.annotations.description}\`\n\n`
        })

      if (data.alerts.length > 5) {
        msg.message += `There are still ${
          data.alerts.length - 5
        } more alerts not displayed in this message.\n\n`
      }

      msg.message += `Firing since ${msg.firingSince}. \n\n`
      msg.message += `📣 [to the alertmanager](${msg.alertLink}) | [view on prometheus](${msg.promLink}) \n`
    } else {
      logger.error(`Data sent by alertmanager are missing some keys: ${data}`)
      throw new Error(`Data sent by alertmanager are missing some keys: ${data}`)
    }

    return msg
  }

  public sendAlertMessage = async (chatID: string, data: any) => {
    const message = this.formatAlertMessage(data)
    const replyMarkup = this.bot.inlineKeyboard([
      [
        // FIXME: link should list all label to point to this specific alert
        this.bot.inlineButton('Link to this alert', { url: message.alertLink }),
        this.bot.inlineButton('Link to prometheus query', { url: message.promLink }),
      ],
      [
        this.bot.inlineButton('Silence 1h', { callback: `alert_1_${data.alerts[0].fingerprint}` }),
        this.bot.inlineButton('Silence 4h', { callback: `alert_4_${data.alerts[0].fingerprint}` }),
        this.bot.inlineButton('Silence 8h', { callback: `alert_8_${data.alerts[0].fingerprint}` }),
        this.bot.inlineButton('Silence 24h', {
          callback: `alert_24_${data.alerts[0].fingerprint}`,
        }),
      ],
    ])
    logger.info(`Alert has been sent to chat/user '${chatID}':\n${message.message}\n---`)
    return this.bot.sendMessage(chatID, message.message, { replyMarkup, parseMode: 'markdown' })
  }

  public manageBotEvents = async () => {
    const meBot = await this.bot.getMe()
    const botName = meBot.username
    const alertManager = new AlertManager()

    // logger
    this.bot.on('text', msg => {
      const user =
        `@${msg.from.username}` ||
        `${msg.from.first_name} ${msg.from.last_name}` ||
        msg.from.first_name ||
        msg.from.id
      logger.info(`${user} send msg#${msg.message_id} (chat_id: '${msg.chat.id}'): ${msg.text}`)
    })

    // eslint-disable-next-line
    this.bot.on(new RegExp(`^\/start(@${botName})?$`), msg => {
      const text = `This bot (@${botName}) is a helper for the IDEV-FSD prometheus and alertmanager: it sends alerts to groups and can list some of the alertmanager's info.
Please run /help to see a list of available commands.
  \t  · version: \`${pjson.version}\`
  \t  · issues: [${pjson.bugs.url}](${pjson.bugs.url})
  \t  · readme: [${pjson.homepage}](${pjson.homepage})`
      logger.info(`${botName} sendMessage to ${msg.chat.id}: ${text}`)
      return this.bot.sendMessage(msg.chat.id, text, { parseMode: 'markdown' })
    })

    // eslint-disable-next-line
    this.bot.on(new RegExp(`^\/help(@${botName})?$`), msg => {
      const text = `**${botName}'s commands**:
  \t  · /start: welcome message, bot information
  \t  · /help: this help
  \t  · /status: output the status of the alertmanager
  \t  · /alerts: lists the current alerts
  \t  · /silences: lists the current silences
  \t  · /receivers: lists the available receivers`
      logger.info(`${botName} sendMessage to ${msg.chat.id}: ${text}`)
      return this.bot.sendMessage(msg.chat.id, text, { parseMode: 'markdown' })
    })

    // eslint-disable-next-line
    this.bot.on(new RegExp(`^\/status(@${botName})?$`), async msg => {
      const amStatus: any = await alertManager.getAlertmanagerAPI('status')
      logger.debug(amStatus.versionInfo)
      let text = '**Alertmanager status**:\n'
      Object.entries(amStatus.versionInfo).forEach((key, value) => {
        text += `\t  - ${key}: \`${value}\`\n`
      })
      logger.info(`${botName} sendMessage to ${msg.chat.id}: ${text}`)
      return this.bot.sendMessage(msg.chat.id, text, { parseMode: 'markdown' })
    })

    // eslint-disable-next-line
    this.bot.on(new RegExp(`^\/alerts(@${botName})?$`), async msg => {
      const alerts: any = await alertManager.getAlertmanagerAPI('alerts')
      const silenceButtons: any[] = []

      let text = "🔔 **Alertmanager's alerts**:\n\n"
      let activeAlertsNumber = 0

      const alertFound: any = {}
      alerts.forEach((alert: any) => {
        if (!alertFound[alert.labels.alertname]) {
          alertFound[alert.labels.alertname] = []
        }
        alertFound[alert.labels.alertname].push(alert)
      })

      Object.entries(alertFound).forEach((alert) => {
        const [alertname, alertVal]: any[] = alert
        activeAlertsNumber += 1
        const firstAlertVal = alertVal[0]
        text += `‣ **Alert id**: \`${firstAlertVal.fingerprint}\` 🔔\n`
        text += `\t  · alertname: \`${alertname}\`\n`
        /* text += `\t  · summary: \`${items.annotations.summary}\`\n`
        text += `\t  · description: \`${items.annotations.description}\`\n`
        text += `\t  · starts: \`${items.startsAt}\`\n`
        text += `\t  · job: \`${items.labels.job}\`\n` */
        text += `\t  · There are ${alertVal.length} similar alerts...\n`
        const alertLink = this.alertLink(firstAlertVal.labels)
        text += `\t  · [view alert on alertmanager](${alertLink}) ⬈\n\n`
        silenceButtons.push(
          this.bot.inlineButton(`Silence: ${firstAlertVal.fingerprint}`, {
            callback: `silence_${firstAlertVal.fingerprint}`,
          })
        )
      })
      if (activeAlertsNumber === 0) {
        text = 'No alerts found. Use /silences to see active silences.'
      }
      const replyMarkup = this.bot.inlineKeyboard(spliceArray(silenceButtons))
      logger.info(`${botName} sendMessage to ${msg.chat.id}: ${text}`)
      return this.bot.sendMessage(msg.chat.id, text, { replyMarkup, parseMode: 'markdown' })
    })

    // eslint-disable-next-line
    this.bot.on(new RegExp(`^\/silences(@${botName})?$`), async msg => {
      const silences: any = await alertManager.getAlertmanagerAPI('silences')
      const silenceButtons: any[] = []
      logger.debug(silences)
      let text = "🔕 **Alertmanager's silences**:\n\n"
      let activeSilencesNumber = 0
      silences.forEach((items: any) => {
        if (items.status.state === 'active') {
          const matchersForLink: any = {}
          activeSilencesNumber += 1
          // do not list expired silences
          text += `‣ **Silence id**: \`${items.id}\` 🔕\n`
          text += `\t  · comment: \`${items.comment}\`\n`
          text += `\t  · createdBy: \`${items.createdBy}\`\n`
          text += `\t  · endsAt: \`${items.endsAt}\`\n`
          text += '\t  · matchers: \n'
          items.matchers.forEach((matcher: any) => {
            matchersForLink[matcher.name] = matcher.value
            text += `\t\t\t\t  · ${matcher.name}: \`${matcher.value}\`\n`
          });
          const silenceLink = this.alertLink(matchersForLink)
          text += `\t  · [view silence on alertmanager](${silenceLink}) ⬈\n`
          text += `\t  ↳ Silence will end in ${humanizeDuration(new Date(items.endsAt))}.\n\n`
          silenceButtons.push(
            this.bot.inlineButton(`Expire: ${items.id.split('-')[0]}`, {
              callback: `expire_${items.id}`,
            })
          )
        }
      })
      const replyMarkup = this.bot.inlineKeyboard(spliceArray(silenceButtons))
      if (activeSilencesNumber === 0) {
        text = 'No silences found. Use /alerts to see active alerts.'
      }
      logger.info(`${botName} sendMessage to ${msg.chat.id}: ${text}`)
      return this.bot.sendMessage(msg.chat.id, text, { replyMarkup, parseMode: 'markdown' })
    })

    // eslint-disable-next-line
    this.bot.on(new RegExp(`^\/receivers(@${botName})?$`), async msg => {
      const receivers: any = await alertManager.getAlertmanagerAPI('receivers')
      logger.debug(`receivers: ${receivers}`)
      let text = "**Alertmanager's receivers**:\n"
      receivers.forEach((items: any) => {
        text += `\t  · ${items.name}\n`
      })
      logger.info(`${botName} sendMessage to ${msg.chat.id}: ${text}`)
      return this.bot.sendMessage(msg.chat.id, text, { parseMode: 'markdown' })
    })

    // Inline button callback
    this.bot.on('callbackQuery', async msg => {
      const user =
        `@${msg.from.username}` ||
        `${msg.from.first_name} ${msg.from.last_name}` ||
        msg.from.first_name ||
        msg.from.id

      // Callback for the /alerts command
      if (msg.data.startsWith('silence_')) {
        // TODO: display duration button and use the same "alert_" callback to d
        // we got a silence to expire
        const fingerprint: any = msg.data.split('silence_')[1]
        const replyMarkup = this.bot.inlineKeyboard([
          [
            this.bot.inlineButton('Silence 1h', { callback: `alert_1_${fingerprint}` }),
            this.bot.inlineButton('Silence 4h', { callback: `alert_4_${fingerprint}` }),
            this.bot.inlineButton('Silence 8h', { callback: `alert_8_${fingerprint}` }),
            this.bot.inlineButton('Silence 24h', { callback: `alert_24_${fingerprint}` }),
          ],
        ])
        this.bot.answerCallbackQuery(msg.id, {
          text: "Return for callback 'silence_'",
          showAlert: false,
        })
        const text = `Please choose the silence duration for the alert ${fingerprint}`
        logger.info(`${botName} sendMessage to ${msg.message.chat.id}: ${text}`)
        return this.bot.sendMessage(msg.message.chat.id, text, {
          replyMarkup,
          parseMode: 'markdown',
        })
      }

      // Callback for the /silences command
      if (msg.data.startsWith('expire_')) {
        // we got a silence to expire
        const silenceId: any = msg.data.split('expire_')[1]
        const amSilence: any = await alertManager.deleteAlertmanagerAPI(`silence/${silenceId}`)
        logger.debug(amSilence)
        let text: string = amSilence
          ? `Silence \`${silenceId}\` is now expired.`
          : `Error while expiring silence ${silenceId}.`
        text += '\nUse /silences to list all active silences.'
        logger.info(`${botName} sendMessage to ${msg.message.chat.id}: ${text}`)
        this.bot.answerCallbackQuery(msg.id, { text, showAlert: false })
        return this.bot.sendMessage(msg.message.chat.id, text)
      }

      // Callback for the alerts message and /silences command
      if (msg.data.startsWith('alert_')) {
        // TODO: it would be nice to update the silence instead of always create
        //       a new one. It would be easy if we add the silence's id to the
        //       POST body.

        // Get alert param (duration and fingerprint)
        const result = msg.data.match(new RegExp(/^alert_(\d+)_(\w+)/))
        const duration: number = result[1]
        const fingerprint: string = result[2]

        // Build the exact matchers list base on alert's labels
        const myAlert = await alertManager.filterWithFingerprint(fingerprint)
        logger.debug(myAlert)
        const matchers: { name: string; value: any; isRegex: boolean }[] = []
        Object.entries(myAlert[0].labels).forEach((key: any, value) => {
          const tmp: { name: string; value: any; isRegex: boolean } = {
            value,
            name: key,
            isRegex: false,
          }
          matchers.push(tmp)
        })
        // Construct the body that will be posted to silence this alert
        const silencedAlertBody = {
          matchers,
          comment: `Silence created from ${botName}`,
          createdBy: user,
          startsAt: moment().format(),
          endsAt: moment().add(duration, 'h').format(),
        }
        // FIXME: try/catch or check the returned value
        const silencedAlert = await alertManager.postAlertmanagerAPI('silences', silencedAlertBody)
        logger.debug(silencedAlert)
        const text = `The alert (#${fingerprint}) "\`${myAlert[0].labels.alertname}\`" has been silenced for ${duration}h.\nUse /silences to list all active silences.`
        this.bot.answerCallbackQuery(msg.id, { text, showAlert: false })
        logger.info(`${botName} sendMessage to ${msg.message.chat.id}: ${text}`)
        return this.bot.sendMessage(
          msg.message.chat.id,
          `The alert (#${fingerprint}) "\`${myAlert[0].labels.alertname}\`" has been silenced for ${duration}h.\nUse /silences to list all active silences.`,
          { parseMode: 'markdown' }
        )
      }
      return false
    })

    // Actually start the bot in a polling mode
    this.bot.start()
  }
}
