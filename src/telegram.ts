import moment from 'moment'
import telebot from 'telebot'
import { AlertManager } from './alertmanager'
import {
  humanizeDuration,
  spliceArray,
  validateGroupOrChatID,
} from './utils'

const debugMode = process.env.DEBUG || false
console.log('debugMode', debugMode)

export class Telegram {

  private bot: telebot

  constructor() {
    if (process.env.TELEGRAM_BOT_TOKEN) {
      this.bot = new telebot(process.env.TELEGRAM_BOT_TOKEN)
    } else {
      console.error('Please define the TELEGRAM_BOT_TOKEN environment variable')
      process.exit(1)
    }
  }

  private formatAlertMessage = (data: any) => {
    const msg: any = {}
    msg.message = ''
    msg.status = data.status
    msg.startsAt = data.alerts[0].startsAt
    msg.promLink = data.alerts[0].generatorURL
    msg.firingSince = humanizeDuration(new Date(msg.startsAt))

    switch (msg['status']) {
      // These emojis could help 🌶🚨❗️📣📢🔔🔕🔥🔇🤫
      case 'firing':
        msg.message += '🔥 Firing 🔥\n\n'
        break
      default:
        msg.message += '🚨 Alerting 🚨\n\n'
        break
    }

    const wantedKeys: string[] = ['alerts', 'commonAnnotations', 'externalURL']
    if (
      wantedKeys.every((key) => {
        return Object.keys(data).includes(key)
      })
    ) {
      msg.message += `Title: _${data.commonAnnotations.summary}_\n\n`
      msg.message += `Description: \`${data.commonAnnotations.description}\`\n\n`
      msg.message += `Firing since ${msg.firingSince}. \n\n`
      msg.message += `📣 [view on prometheus](${msg.promLink}) | [to the alertmanager](${data.externalURL})\n`
    } else {
      throw new Error(`Data send by alertmanager are bad: ${data}`)
    }

    return msg
  }

  public sendAlertMessage = async (chatID: string, data: any) => {
    const message = this.formatAlertMessage(data)
    console.log(`${moment().format()}: send message to ${chatID}\n${message['message']}\n`)
    const replyMarkup = this.bot.inlineKeyboard([
      [
        // FIXME: link should list all label to point to this specific alert
        this.bot.inlineButton('Link to this alert', { url: 'https://am-tst.idev-fsd.ml/#/alerts?silenced=false&inhibited=false&active=true&filter=%7Bslug%3D%22canari%22%7D' }),
        this.bot.inlineButton('Link to prometheus query', { url: message['promLink'] }),
      ],
      [
        this.bot.inlineButton('Silence 1h', { callback: `alert_1_${data.alerts[0].fingerprint}` }),
        this.bot.inlineButton('Silence 4h', { callback: `alert_4_${data.alerts[0].fingerprint}` }),
        this.bot.inlineButton('Silence 8h', { callback: `alert_8_${data.alerts[0].fingerprint}` }),
        this.bot.inlineButton('Silence 24h', { callback: `alert_24_${data.alerts[0].fingerprint}` }),
      ],
    ])
    return await this.bot.sendMessage(chatID, message['message'], { replyMarkup, parseMode: 'markdown' })
  }

  public manageBotEvents = async () => {
    const meBot = await this.bot.getMe()
    const botName = meBot.username
    const alertManager = new AlertManager()

    // logger
    this.bot.on('text', (msg, props) => {
      const user = `@${msg.from.username}` || `${msg.from.first_name} ${msg.from.last_name}` || msg.from.first_name || msg.from.id
      console.log(`${moment().format()}: ${user} send msg#${msg.message_id} (chat_id: '${msg.chat.id}'): ${msg.text}`)
    })

    this.bot.on(new RegExp(`^\/start(@${botName})?$`), (msg) => {
      const pjson = require('../package.json')
      const text = `This bot (@${botName}) is a helper for the IDEV-FSD prometheus and alertmanager: it sends alerts to groups and can list some of the alertmanager's info.
Please run /help to see a list of available commands.
  \t  · version: \`${pjson.version}\`
  \t  · issues: [${pjson.bugs.url}](${pjson.bugs.url})
  \t  · readme: [${pjson.homepage}](${pjson.homepage})`
      console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
      return this.bot.sendMessage(msg.chat.id, text, { parseMode: 'markdown' })
    })

    this.bot.on(new RegExp(`^\/help(@${botName})?$`), (msg) => {
      const text = `**${botName}'s commands**:
  \t  · /start: welcome message, bot information
  \t  · /help: this help
  \t  · /status: output the status of the alertmanager
  \t  · /alerts: lists the current alerts
  \t  · /silences: lists the current silences
  \t  · /receivers: lists the available receivers`
      console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
      return this.bot.sendMessage(msg.chat.id, text, { parseMode: 'markdown' })
    })

    this.bot.on(new RegExp(`^\/status(@${botName})?$`), async (msg) => {
      const amStatus: any = await alertManager.getAlertmanagerAPI('status')
      if (debugMode) console.debug(amStatus.versionInfo)
      let text = '**Alertmanager status**:\n'
      for (const [key, value] of Object.entries(amStatus.versionInfo)) {
        text += `\t  - ${key}: \`${value}\`\n`
      }
      console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
      return this.bot.sendMessage(msg.chat.id, text, { parseMode: 'markdown' })
    })

    this.bot.on(new RegExp(`^\/alerts(@${botName})?$`), async (msg) => {
      const alerts: any = await alertManager.getAlertmanagerAPI('alerts')
      const silenceButtons: any[] = []
      if (debugMode) console.debug('alerts', alerts)
      let text = '🔔 **Alertmanager\'s alerts**:\n\n'
      let activeAlertsNumber: number = 0
      alerts.forEach((items: any) => {
        activeAlertsNumber += 1
        text += `‣ **Alert id**: \`${items.fingerprint}\` 🔔\n`
        text += `\t  · alertname: \`${items.labels.alertname}\`\n`
        text += `\t  · summary: \`${items.annotations.summary}\`\n`
        text += `\t  · description: \`${items.annotations.description}\`\n`
        text += `\t  · starts: \`${items.startsAt}\`\n`
        // It seems that tg does not accept URL with prom query in them :/
        // text += `\t  • URL: [generatorURL](${items.generatorURL})\n`
        text += `\t  · job: \`${items.labels.job}\`\n\n`
        silenceButtons.push(this.bot.inlineButton(`Silence: ${items.fingerprint}`, { callback: `silence_${items.fingerprint}` }))
      })
      console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
      if (activeAlertsNumber === 0) {
        text = 'No alerts found. Use /silences to see active silences.'
      }
      const replyMarkup = this.bot.inlineKeyboard(spliceArray(silenceButtons))
      return this.bot.sendMessage(msg.chat.id, text, { replyMarkup, parseMode: 'markdown' })
    })

    this.bot.on(new RegExp(`^\/silences(@${botName})?$`), async (msg) => {
      const silences: any = await alertManager.getAlertmanagerAPI('silences')
      const silenceButtons: any[] = []
      if (debugMode) console.debug(silences)
      let text = '🔕 **Alertmanager\'s silences**:\n\n'
      let activeSilencesNumber: number = 0
      silences.forEach((el: any) => {
        if (el.status.state === 'active') {
          activeSilencesNumber += 1
          // do not list expired silences
          console.log(el.matchers)
          text += `‣ **Silence id**: \`${el.id}\` 🔕\n`
          text += `\t  · comment: \`${el.comment}\`\n`
          text += `\t  · createdBy: \`${el.createdBy}\`\n`
          text += `\t  · endsAt: \`${el.endsAt}\`\n`
          text += '\t  · matchers: \n'
          for (const matcher of el.matchers) {
            text += `\t\t\t\t  · ${matcher.name}: \`${matcher.value}\`\n`
          }
          text += `\t  Silence will end in ${humanizeDuration(new Date(el.endsAt))}.\n\n`
          silenceButtons.push(this.bot.inlineButton(`Expire: ${el.id.split('-')[0]}`, { callback: `expire_${el.id}` }))
        }
      })
      const replyMarkup = this.bot.inlineKeyboard(spliceArray(silenceButtons))
      console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
      if (activeSilencesNumber === 0) {
        text = 'No silences found. Use /alerts to see active alerts.'
      }
      return this.bot.sendMessage(msg.chat.id, text, { replyMarkup, parseMode: 'markdown' })
    })

    this.bot.on(new RegExp(`^\/receivers(@${botName})?$`), async (msg) =>  {
      const receivers: any = await alertManager.getAlertmanagerAPI('receivers')
      if (debugMode) console.debug('receivers', receivers)
      let text = '**Alertmanager\'s receivers**:\n'
      receivers.forEach((items: any) => {
        text += `\t  · ${items.name}\n`
      })
      console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
      return this.bot.sendMessage(msg.chat.id, text, { parseMode: 'markdown' })
    })

    // Inline button callback
    this.bot.on('callbackQuery', async (msg) => {
      const user = `@${msg.from.username}` || `${msg.from.first_name} ${msg.from.last_name}` || msg.from.first_name || msg.from.id

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
        this.bot.answerCallbackQuery(msg.id, { text: "Return for callback 'silence_'", showAlert: false })
        return await this.bot.sendMessage(
          msg.message.chat.id, `Please choose the silence duration for the alert ${fingerprint}`,
          { replyMarkup, parseMode: 'markdown' },
        )
      }

      // Callback for the /silences command
      if (msg.data.startsWith('expire_')) {
        // we got a silence to expire
        const silenceId: any = msg.data.split('expire_')[1]
        const amSilence: any = await alertManager.deleteAlertmanagerAPI(`silence/${silenceId}`)
        console.log(amSilence)
        let message: string = (amSilence) ? `Silence \`${silenceId}\` is now expired.` : `Error while expiring silence ${silenceId}.`
        message += '\nUse /silences to list all active silences.'
        this.bot.sendMessage(msg.message.chat.id, message)
        return this.bot.answerCallbackQuery(msg.id, { text: message, showAlert: false })
      }

      // Callback for the /silences command
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
        console.log(myAlert)
        const matchers = []
        for (const [key, value] of Object.entries(myAlert[0].labels)) {
          const tmp: { name: string, value: any, isRegex: boolean } = {
            value,
            name: key,
            isRegex: false,
          }
          matchers.push(tmp)
        }
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
        this.bot.answerCallbackQuery(msg.id, { text: `The alert (#${fingerprint}) "\`${myAlert[0].labels.alertname}\`" has been silenced for ${duration}h.\nUse /silences to list all active silences.`, showAlert: false })
        return this.bot.sendMessage(msg.message.chat.id, `The alert (#${fingerprint}) "\`${myAlert[0].labels.alertname}\`" has been silenced for ${duration}h.\nUse /silences to list all active silences.`, { parseMode: 'markdown' })
      }

    })

    // Actually strat the bot in a polling mode
    this.bot.start()
  }
}
